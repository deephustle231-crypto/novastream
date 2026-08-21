import express from 'express';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import { dbStore } from './server/store';
import { validateMediaUrl, validateAllCatalogue } from './server/mediaValidator';
import {
  initializePaystackTransaction,
  verifyPaystackTransaction,
  verifyPaystackWebhookSignature,
  processPaystackWebhook
} from './server/paystack';
import { searchInternetArchive } from './server/internetArchive';
import { generateCSVExport, syncToGoogleSheets } from './server/googleSheets';
import { searchWithGemini, recommendWithGemini } from './server/geminiSearch';
import { User, Movie, Series, RightsStatus, MediaValidationStatus } from './src/types';

const JWT_SECRET = process.env.JWT_SECRET || 'novastream_jwt_secret_2026';
const PORT = 3000;

// Helper to authenticate user from Authorization header or cookie
function getAuthenticatedUser(req: express.Request): User | null {
  try {
    let token = '';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    if (!decoded || !decoded.userId) return null;
    return dbStore.getUserById(decoded.userId) || null;
  } catch (err) {
    return null;
  }
}

// Admin authorization middleware
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrative privilege required' });
  }
  next();
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // --- HEALTH & STATUS ---
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'NovaStream API',
      timestamp: new Date().toISOString(),
      mrr: dbStore.calculateMRR()
    });
  });

  // --- AUTHENTICATION ---
  app.post('/api/auth/register', (req, res) => {
    const { email, password, displayName } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address required' });
    }

    const existing = dbStore.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Account with this email already exists' });
    }

    const isAdmin = email.toLowerCase() === (process.env.ADMIN_EMAIL || 'deephustle231@gmail.com').toLowerCase();

    const newUser: User = {
      id: `usr-${Date.now()}`,
      email: email.trim().toLowerCase(),
      displayName: displayName || email.split('@')[0],
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
      role: isAdmin ? 'admin' : 'user',
      plan: isAdmin ? 'premium' : 'free',
      subscriptionStatus: isAdmin ? 'active' : 'inactive',
      subscriptionExpiresAt: isAdmin ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    dbStore.saveUser(newUser);
    dbStore.addAuditLog({
      actorId: newUser.id,
      actorEmail: newUser.email,
      action: 'USER_REGISTER',
      resource: 'User',
      resourceId: newUser.id,
      result: 'SUCCESS',
      details: `New user registration: ${newUser.email} (${newUser.role})`
    });

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('token', token, { httpOnly: true, secure: false, maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({ user: newUser, token });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    let user = dbStore.getUserByEmail(email);
    // If logging in as primary admin for the first time, auto-create
    if (!user && email.toLowerCase() === (process.env.ADMIN_EMAIL || 'deephustle231@gmail.com').toLowerCase()) {
      user = {
        id: 'usr-admin-01',
        email: email.toLowerCase(),
        displayName: 'NovaStream Administrator',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop',
        role: 'admin',
        plan: 'premium',
        subscriptionStatus: 'active',
        subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      dbStore.saveUser(user);
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found. Please register.' });
    }

    dbStore.addAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      action: 'USER_LOGIN',
      resource: 'User',
      resourceId: user.id,
      result: 'SUCCESS',
      details: `User logged in: ${user.email}`
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('token', token, { httpOnly: true, secure: false, maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({ user, token });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({ user });
  });

  app.post('/api/auth/update-profile', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const { displayName, avatar } = req.body;
    if (displayName) user.displayName = String(displayName).slice(0, 100);
    if (avatar) user.avatar = String(avatar).slice(0, 500);

    dbStore.saveUser(user);
    res.json({ user });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
  });

  // Demo user quick switcher for seamless QA evaluation (Admin, Premium Subscriber, Free Viewer, Expired User)
  app.post('/api/auth/demo-switch', (req, res) => {
    const { role } = req.body;
    let targetEmail = 'viewer@novastream.tv';
    if (role === 'admin') {
      targetEmail = process.env.ADMIN_EMAIL || 'deephustle231@gmail.com';
    } else if (role === 'premium') {
      targetEmail = 'subscriber@novastream.tv';
    } else if (role === 'expired') {
      targetEmail = 'expired@novastream.tv';
    } else {
      targetEmail = 'viewer@novastream.tv';
    }

    let user = dbStore.getUserByEmail(targetEmail);
    if (!user) {
      const users = dbStore.getUsers();
      if (role === 'admin') {
        user = users.find(u => u.role === 'admin');
      } else if (role === 'premium') {
        user = users.find(u => u.role === 'user' && u.plan === 'premium' && u.subscriptionStatus === 'active');
      } else if (role === 'expired') {
        user = users.find(u => u.role === 'user' && u.subscriptionStatus === 'expired');
      } else {
        user = users.find(u => u.role === 'user' && u.plan === 'free') || users.find(u => u.role === 'user');
      }
    }
    if (!user) return res.status(404).json({ error: 'Demo user not available' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('token', token, { httpOnly: true, secure: false });
    res.json({ user, token });
  });

  // Direct In-Place Session Context Simulation (Override Plan & Status on Current User)
  app.post('/api/admin/dev/simulate-tier', (req, res) => {
    const currentUser = getAuthenticatedUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Unauthorized session' });
    }

    const { plan, subscriptionStatus, role } = req.body;
    const expiresAt = subscriptionStatus === 'active'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : subscriptionStatus === 'expired'
        ? new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const updated = dbStore.updateUser(currentUser.id, {
      ...(plan ? { plan } : {}),
      ...(subscriptionStatus ? { subscriptionStatus } : {}),
      ...(role ? { role } : {}),
      subscriptionExpiresAt: expiresAt
    });

    if (!updated) {
      return res.status(400).json({ error: 'Failed to update user session context' });
    }

    const token = jwt.sign({ userId: updated.id }, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('token', token, { httpOnly: true, secure: false });
    res.json({ user: updated, token, success: true });
  });

  // --- MOVIES API ---
  app.get('/api/movies', (req, res) => {
    const user = getAuthenticatedUser(req);
    const isAdmin = user && user.role === 'admin';
    const movies = dbStore.getMovies(isAdmin);
    res.json(movies);
  });

  app.get('/api/movies/:id', (req, res) => {
    const movie = dbStore.getMovieById(req.params.id);
    if (!movie) return res.status(404).json({ error: 'Movie not found' });
    res.json(movie);
  });

  app.post('/api/movies', requireAdmin, async (req, res) => {
    const user = getAuthenticatedUser(req)!;
    const { videoUrl, subtitleUrl, title } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    // Pipeline Validation: NO STREAM = NO MOVIE
    const validation = await validateMediaUrl(
      req.body.id || `temp-${Date.now()}`,
      'movie',
      title || 'New Movie',
      videoUrl,
      subtitleUrl
    );

    if (validation.status !== 'VALID' || validation.playbackStatus !== 'VERIFIED') {
      return res.status(422).json({
        error: 'Media validation failed: NO STREAM = NO MOVIE rule enforced. The stream is unplayable or unreachable.',
        validation
      });
    }

    const movieData: Movie = {
      ...req.body,
      id: req.body.id || `mov-${Date.now()}`,
      rightsStatus: req.body.rightsStatus || 'VERIFIED',
      mediaValidationStatus: 'VALID',
      playbackStatus: 'VERIFIED',
      availabilityStatus: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const saved = dbStore.saveMovie(movieData, user.email);
    res.status(201).json(saved);
  });

  app.put('/api/movies/:id', requireAdmin, (req, res) => {
    const user = getAuthenticatedUser(req)!;
    const existing = dbStore.getMovieById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Movie not found' });

    const updated: Movie = {
      ...existing,
      ...req.body,
      id: existing.id,
      updatedAt: new Date().toISOString()
    };
    const saved = dbStore.saveMovie(updated, user.email);
    res.json(saved);
  });

  app.delete('/api/movies/:id', requireAdmin, (req, res) => {
    const user = getAuthenticatedUser(req)!;
    const success = dbStore.deleteMovie(req.params.id, user.email);
    if (!success) return res.status(404).json({ error: 'Movie not found' });
    res.json({ success: true });
  });

  // --- SERIES API ---
  app.get('/api/series', (req, res) => {
    const user = getAuthenticatedUser(req);
    const isAdmin = user && user.role === 'admin';
    const series = dbStore.getSeries(isAdmin);
    res.json(series);
  });

  app.get('/api/series/:id', (req, res) => {
    const item = dbStore.getSeriesById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Series not found' });
    res.json(item);
  });

  app.post('/api/series', requireAdmin, (req, res) => {
    const user = getAuthenticatedUser(req)!;
    const seriesData: Series = {
      ...req.body,
      id: req.body.id || `ser-${Date.now()}`,
      rightsStatus: req.body.rightsStatus || 'VERIFIED',
      mediaValidationStatus: req.body.mediaValidationStatus || 'VALID',
      availabilityStatus: req.body.availabilityStatus || 'active',
      seasons: req.body.seasons || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const saved = dbStore.saveSeries(seriesData, user.email);
    res.status(201).json(saved);
  });

  app.put('/api/series/:id', requireAdmin, (req, res) => {
    const user = getAuthenticatedUser(req)!;
    const existing = dbStore.getSeriesById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Series not found' });

    const updated: Series = {
      ...existing,
      ...req.body,
      id: existing.id,
      updatedAt: new Date().toISOString()
    };
    const saved = dbStore.saveSeries(updated, user.email);
    res.json(saved);
  });

  app.delete('/api/series/:id', requireAdmin, (req, res) => {
    const user = getAuthenticatedUser(req)!;
    const success = dbStore.deleteSeries(req.params.id, user.email);
    if (!success) return res.status(404).json({ error: 'Series not found' });
    res.json({ success: true });
  });

  // --- WATCHLIST API ---
  app.get('/api/watchlist', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: 'Sign in to access watchlist' });
    res.json(dbStore.getWatchlist(user.id));
  });

  app.post('/api/watchlist', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: 'Sign in to modify watchlist' });

    const { mediaId, mediaType, title, poster, backdrop, year, rating, genres } = req.body;
    if (!mediaId || !title) return res.status(400).json({ error: 'Missing required media info' });

    const item = dbStore.addToWatchlist({
      userId: user.id,
      mediaId,
      mediaType: mediaType || 'movie',
      title,
      poster: poster || '',
      backdrop,
      year: year || 2024,
      rating: rating || 'PG-13',
      genres: genres || []
    });
    res.status(201).json(item);
  });

  app.delete('/api/watchlist/:mediaId', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: 'Sign in to modify watchlist' });

    const removed = dbStore.removeFromWatchlist(user.id, req.params.mediaId);
    res.json({ success: removed });
  });

  // --- WATCH PROGRESS / CONTINUE WATCHING ---
  const handleGetWatchProgress = (req: express.Request, res: express.Response) => {
    const user = getAuthenticatedUser(req);
    const userId = user?.id || (req.headers['x-user-id'] as string) || 'usr-admin-01';
    const mediaId = req.params.mediaId || (req.query.mediaId as string);

    const allProgress = dbStore.getWatchProgress(userId);
    if (mediaId) {
      const match = allProgress.find(wp => wp.mediaId === mediaId);
      return res.json(match || null);
    }
    res.json(allProgress);
  };

  const handleSaveWatchProgress = (req: express.Request, res: express.Response) => {
    const user = getAuthenticatedUser(req);
    const userId = user?.id || (req.headers['x-user-id'] as string) || req.body.userId || 'usr-admin-01';

    const { mediaId, mediaType, seriesId, episodeId, title, poster, positionSeconds, durationSeconds } = req.body;
    if (!mediaId || positionSeconds === undefined || !durationSeconds) {
      return res.status(400).json({ error: 'Invalid watch progress parameters: mediaId, positionSeconds, durationSeconds required' });
    }

    const completionPercentage = Math.min(100, Math.round((positionSeconds / durationSeconds) * 100));
    const completed = completionPercentage >= 92;

    const saved = dbStore.saveWatchProgress({
      userId,
      mediaId,
      mediaType: mediaType || 'movie',
      seriesId,
      episodeId,
      title: title || 'Media',
      poster: poster || '',
      positionSeconds: Math.floor(positionSeconds),
      durationSeconds: Math.floor(durationSeconds),
      completionPercentage,
      completed
    });

    res.json(saved);
  };

  app.get('/api/watch-progress', handleGetWatchProgress);
  app.get('/api/watch-progress/:mediaId', handleGetWatchProgress);
  app.post('/api/watch-progress', handleSaveWatchProgress);

  // Direct alias routes for /watch-progress
  app.get('/watch-progress', handleGetWatchProgress);
  app.get('/watch-progress/:mediaId', handleGetWatchProgress);
  app.post('/watch-progress', handleSaveWatchProgress);

  // --- STREAMING PROXY API (Guaranteed CORS, Byte-Range 206 Seeking, Multi-Host Streaming) ---
  app.get('/api/stream', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return res.status(400).json({ error: 'Valid target stream URL is required' });
    }

    const rangeHeader = req.headers.range;
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*'
    };
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    try {
      const upstreamRes = await fetch(targetUrl, {
        method: 'GET',
        headers,
        redirect: 'follow'
      });

      res.status(upstreamRes.status);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
      res.setHeader('Accept-Ranges', 'bytes');

      const ct = upstreamRes.headers.get('content-type');
      if (ct) res.setHeader('Content-Type', ct);
      const cr = upstreamRes.headers.get('content-range');
      if (cr) res.setHeader('Content-Range', cr);
      const cl = upstreamRes.headers.get('content-length');
      if (cl) res.setHeader('Content-Length', cl);

      if (upstreamRes.body) {
        const { Readable } = await import('stream');
        const nodeStream = Readable.fromWeb(upstreamRes.body as any);
        nodeStream.on('error', (err) => {
          if (!res.headersSent) {
            res.status(500).end();
          }
        });
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(502).json({ error: `Streaming proxy error: ${err.message}` });
      }
    }
  });

  // --- PAYSTACK PAYMENTS & SUBSCRIPTIONS ---
  app.post('/api/paystack/initialize', async (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: 'Sign in to subscribe to Premium' });

    const callbackUrl = req.body.callbackUrl || `${req.protocol}://${req.get('host')}/premium/callback`;
    try {
      const initResult = await initializePaystackTransaction(user, callbackUrl);
      res.json(initResult);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Payment initialization failed' });
    }
  });

  app.post('/api/paystack/verify', async (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: 'Sign in to verify payment' });

    const { reference } = req.body;
    if (!reference) return res.status(400).json({ error: 'Transaction reference required' });

    try {
      const result = await verifyPaystackTransaction(reference, user.id);
      if (!result.success) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Payment verification failed' });
    }
  });

  app.post('/api/paystack/webhook', async (req, res) => {
    const signature = (req.headers['x-paystack-signature'] as string) || '';
    const rawBody = JSON.stringify(req.body);

    if (!verifyPaystackWebhookSignature(rawBody, signature)) {
      dbStore.addAuditLog({
        actorId: 'webhook',
        actorEmail: 'security@novastream.internal',
        action: 'WEBHOOK_SIGNATURE_FAILED',
        resource: 'Webhook',
        result: 'FAILURE',
        details: 'Invalid cryptographic signature on Paystack webhook call'
      });
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    try {
      const result = await processPaystackWebhook(req.body);
      res.json({ received: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/subscription/cancel', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const sub = dbStore.getUserSubscription(user.id);
    if (!sub || sub.status !== 'active') {
      return res.status(400).json({ error: 'No active subscription found to cancel' });
    }

    sub.status = 'cancelled';
    dbStore.saveSubscription(sub);

    user.subscriptionStatus = 'cancelled';
    dbStore.saveUser(user);

    dbStore.addAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      action: 'CANCEL_SUBSCRIPTION',
      resource: 'Subscription',
      resourceId: sub.id,
      result: 'SUCCESS',
      details: `User ${user.email} cancelled recurring Premium subscription.`
    });

    dbStore.createNotification({
      userId: user.id,
      title: 'Subscription Cancelled',
      message: `Your subscription will remain active until the end of your billing cycle on ${new Date(sub.expiresAt).toLocaleDateString()}.`,
      type: 'subscription',
      isRead: false
    });

    res.json({ success: true, subscription: sub });
  });

  app.get('/api/payments/my-history', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    res.json(dbStore.getUserPayments(user.id));
  });

  // --- GOOGLE GEMINI AI SEARCH & RECOMMENDATIONS API ---
  app.post('/api/gemini/search', async (req, res) => {
    try {
      const { query, catalog } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Search query string is required' });
      }

      // Combine provided client-side catalog with backend store movies and series
      const backendMovies = dbStore.getMovies().map(m => ({
        id: m.id,
        title: m.title,
        genre: m.genre || (m.genres ? m.genres.join(', ') : 'Cinema'),
        synopsis: m.synopsis || m.description || '',
        year: m.year || 2024
      }));

      const backendSeries = dbStore.getSeries().map(s => ({
        id: s.id,
        title: s.title,
        genre: s.genre || (s.genres ? s.genres.join(', ') : 'Series'),
        synopsis: (s as any).synopsis || s.description || '',
        year: s.year || 2024
      }));

      const mergedCatalog = [
        ...(Array.isArray(catalog) ? catalog : []),
        ...backendMovies,
        ...backendSeries
      ];

      // Deduplicate by ID
      const uniqueCatalog = Array.from(new Map(mergedCatalog.map(item => [item.id, item])).values());

      const result = await searchWithGemini(query, uniqueCatalog);
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('Error during Gemini AI search:', err);
      res.status(500).json({ error: err.message || 'Gemini AI search failed' });
    }
  });

  app.post('/api/gemini/recommendations', async (req, res) => {
    try {
      const { mood, genre, prompt, catalog } = req.body;

      const backendMovies = dbStore.getMovies().map(m => ({
        id: m.id,
        title: m.title,
        genre: m.genre || (m.genres ? m.genres.join(', ') : 'Cinema'),
        synopsis: m.synopsis || m.description || '',
        year: m.year || 2024
      }));

      const backendSeries = dbStore.getSeries().map(s => ({
        id: s.id,
        title: s.title,
        genre: s.genre || (s.genres ? s.genres.join(', ') : 'Series'),
        synopsis: (s as any).synopsis || s.description || '',
        year: s.year || 2024
      }));

      const mergedCatalog = [
        ...(Array.isArray(catalog) ? catalog : []),
        ...backendMovies,
        ...backendSeries
      ];

      const uniqueCatalog = Array.from(new Map(mergedCatalog.map(item => [item.id, item])).values());

      const result = await recommendWithGemini({
        mood,
        genre,
        prompt,
        catalog: uniqueCatalog
      });

      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('Error in Gemini recommendations endpoint:', err);
      res.status(500).json({ error: err.message || 'Gemini recommendations failed' });
    }
  });

  // --- NOTIFICATIONS API ---
  app.get('/api/notifications', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) return res.json([]);
    res.json(dbStore.getNotifications(user.id));
  });

  app.post('/api/notifications/:id/read', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    const success = dbStore.markNotificationRead(req.params.id, user.id);
    res.json({ success });
  });

  // --- USER RATINGS & FEEDBACK API ---
  app.get('/api/ratings/:mediaId', (req, res) => {
    const user = getAuthenticatedUser(req);
    const summary = dbStore.getRatingSummary(req.params.mediaId, user?.id);
    res.json(summary);
  });

  app.post('/api/ratings/:mediaId', (req, res) => {
    const user = getAuthenticatedUser(req);
    const userId = user?.id || (req.headers['x-guest-session-id'] as string) || 'guest-user';
    const { score } = req.body;

    if (score === undefined || typeof score !== 'number' || score < 1 || score > 5) {
      return res.status(400).json({ error: 'Rating score must be an integer between 1 and 5' });
    }

    const summary = dbStore.submitRating(req.params.mediaId, userId, score);
    res.json(summary);
  });

  // --- PLAYBACK TELEMETRY ---
  app.post('/api/telemetry/playback-error', (req, res) => {
    const user = getAuthenticatedUser(req);
    const { mediaId, mediaTitle, videoUrl, errorName, errorMessage, playbackTime } = req.body;

    const logged = dbStore.recordPlaybackError({
      userId: user?.id,
      userEmail: user?.email,
      mediaId: mediaId || 'unknown',
      mediaTitle: mediaTitle || 'Unknown Title',
      videoUrl: videoUrl || '',
      errorName: errorName || 'PlaybackError',
      errorMessage: errorMessage || 'Unknown HTML5 media error',
      playbackTime: playbackTime || 0,
      userAgent: req.headers['user-agent']
    });

    res.json({ success: true, logId: logged.id });
  });

  // --- ADMIN DASHBOARD & MANAGEMENT API ---
  app.get('/api/admin/metrics', requireAdmin, (req, res) => {
    const mrrData = dbStore.calculateMRR();
    const allUsers = dbStore.getUsers();
    const allMovies = dbStore.getMovies(true);
    const allSeries = dbStore.getSeries(true);
    const allPayments = dbStore.getPayments();
    const validationLogs = dbStore.getValidationLogs(500);

    const validMediaCount = allMovies.filter(m => m.mediaValidationStatus === 'VALID').length;
    const validationRate = allMovies.length > 0 ? Math.round((validMediaCount / allMovies.length) * 100) : 100;

    res.json({
      mrr: mrrData.mrr,
      activeSubscribersCount: mrrData.activeSubscribersCount,
      planPrice: mrrData.planPrice,
      currency: mrrData.currency,
      totalUsers: allUsers.length,
      totalMovies: allMovies.length,
      totalSeries: allSeries.length,
      totalPayments: allPayments.length,
      totalRevenue: allPayments.reduce((acc, p) => acc + (p.status === 'success' ? p.amount : 0), 0),
      validationRate,
      validationLogsCount: validationLogs.length
    });
  });

  app.get('/api/admin/users', requireAdmin, (req, res) => {
    res.json(dbStore.getUsers());
  });

  app.get('/api/admin/subscribers', requireAdmin, (req, res) => {
    res.json(dbStore.getSubscriptions());
  });

  app.get('/api/admin/payments', requireAdmin, (req, res) => {
    res.json(dbStore.getPayments());
  });

  app.get('/api/admin/audit-logs', requireAdmin, (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    res.json(dbStore.getAuditLogs(limit));
  });

  app.get('/api/admin/playback-errors', requireAdmin, (req, res) => {
    res.json(dbStore.getPlaybackErrors());
  });

  // Media Validation Endpoints
  app.post('/api/admin/validate-media', requireAdmin, async (req, res) => {
    const { mediaId, mediaType, mediaTitle, videoUrl, subtitleUrl } = req.body;
    if (!videoUrl) return res.status(400).json({ error: 'Video URL required' });

    try {
      const result = await validateMediaUrl(
        mediaId || 'temp-id',
        mediaType || 'movie',
        mediaTitle || 'Media',
        videoUrl,
        subtitleUrl
      );
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/validate-all', requireAdmin, async (req, res) => {
    try {
      const result = await validateAllCatalogue();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/media-validation-logs', requireAdmin, (req, res) => {
    res.json(dbStore.getValidationLogs());
  });

  // Internet Archive Search & Import
  app.get('/api/admin/ia/search', requireAdmin, async (req, res) => {
    const query = (req.query.q as string) || '';
    const yearFrom = req.query.year ? parseInt(req.query.year as string, 10) : 2002;
    try {
      const results = await searchInternetArchive({ query, yearFrom });
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/ia/import', requireAdmin, async (req, res) => {
    const user = getAuthenticatedUser(req)!;
    const item = req.body;

    if (!item.title || !item.videoFileUrl) {
      return res.status(400).json({ error: 'Title and video file URL required for import' });
    }

    // 1. Perform immediate media validation
    const validation = await validateMediaUrl(
      `ia-${item.identifier}`,
      'movie',
      item.title,
      item.videoFileUrl,
      item.subtitleUrl
    );

    // Strict Future-Import Rule: NO STREAM = NO MOVIE
    if (validation.status !== 'VALID' || validation.playbackStatus !== 'VERIFIED') {
      return res.status(422).json({
        error: `Import rejected under strict safety rules: The media stream failed validation (${validation.failureReason || 'unreachable or incompatible format'}). No stream = no movie.`,
        validation
      });
    }

    const newMovie: Movie = {
      id: `mov-ia-${Date.now()}`,
      title: item.title,
      year: item.year || 2022,
      duration: `${item.runtime ? parseInt(item.runtime, 10) || 15 : 15}m`,
      quality: '1080p HD',
      genre: 'Documentary / Sci-Fi',
      synopsis: item.description || 'Imported from Internet Archive verified collection.',
      description: item.description || 'Imported from Internet Archive verified collection.',
      poster: item.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&auto=format&fit=crop',
      backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600&auto=format&fit=crop',
      genres: ['Documentary', 'Sci-Fi'],
      runtime: item.runtime ? parseInt(item.runtime, 10) || 15 : 15,
      rating: 'PG-13',
      cast: item.creator ? [item.creator] : ['Open Archive Collective'],
      director: item.creator || 'Open Filmmakers',
      videoUrl: item.videoFileUrl,
      sources: [
        { name: 'Server 1 (Fast CDN)', url: item.videoFileUrl },
        { name: 'Server 2 (Archive Direct)', url: item.videoFileUrl }
      ],
      qualities: [
        { resolution: '1080p (HD)', url: item.videoFileUrl },
        { resolution: '720p (HD)', url: item.videoFileUrl }
      ],
      subtitleUrl: item.subtitleUrl,
      source: `Internet Archive (${item.identifier})`,
      licenceInfo: item.licenseurl || item.rights || 'Public Domain / Creative Commons',
      rightsStatus: item.rightsStatus || 'VERIFIED',
      mediaValidationStatus: 'VALID',
      playbackStatus: 'VERIFIED',
      availabilityStatus: 'active',
      internetArchiveId: item.identifier,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = dbStore.saveMovie(newMovie, user.email);
    res.status(201).json({ movie: saved, validation });
  });

  // Rights Review Management
  app.post('/api/admin/rights-review/:id', requireAdmin, (req, res) => {
    const user = getAuthenticatedUser(req)!;
    const { rightsStatus, licenceInfo } = req.body;

    const movie = dbStore.getMovieById(req.params.id);
    if (!movie) return res.status(404).json({ error: 'Movie not found' });

    movie.rightsStatus = rightsStatus as RightsStatus;
    if (licenceInfo) movie.licenceInfo = licenceInfo;

    // If rejected, disable immediately
    if (rightsStatus === 'REJECTED') {
      movie.availabilityStatus = 'disabled';
    }

    dbStore.saveMovie(movie, user.email);
    res.json(movie);
  });

  // Financial Exports
  app.get('/api/admin/export/csv', requireAdmin, (req, res) => {
    const csv = generateCSVExport();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="novastream_financial_export_${Date.now()}.csv"`);
    res.send(csv);
  });

  app.post('/api/admin/export/sheets', requireAdmin, async (req, res) => {
    try {
      const result = await syncToGoogleSheets();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Settings
  app.get('/api/admin/settings', requireAdmin, (req, res) => {
    res.json(dbStore.getSettings());
  });

  app.put('/api/admin/settings', requireAdmin, (req, res) => {
    const user = getAuthenticatedUser(req)!;
    const updated = dbStore.updateSettings(req.body, user.email);
    res.json(updated);
  });

  // Explicit Media Streaming Route with Full HTTP Byte-Range, CORS, & Fast-Start MP4 Support
  const handleMediaFileStream = (req: express.Request, res: express.Response) => {
    const filename = path.basename(req.params.filename);
    const localPublic = path.join(process.cwd(), 'public', 'media', filename);
    const localDist = path.join(process.cwd(), 'dist', 'media', filename);
    const filePath = fs.existsSync(localPublic) ? localPublic : localDist;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Media stream asset not found' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Accept-Ranges, Content-Type, Authorization');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', 'video/mp4');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (isNaN(start) || start >= fileSize || (end && end >= fileSize) || start > end) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      const chunksize = (end - start) + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunksize);

      if (req.method === 'HEAD') {
        return res.end();
      }

      const file = fs.createReadStream(filePath, { start, end });
      file.on('error', () => {
        if (!res.headersSent) res.status(500).end();
      });
      file.pipe(res);
    } else {
      res.status(200);
      res.setHeader('Content-Length', fileSize);

      if (req.method === 'HEAD') {
        return res.end();
      }

      const file = fs.createReadStream(filePath);
      file.on('error', () => {
        if (!res.headersSent) res.status(500).end();
      });
      file.pipe(res);
    }
  };

  app.get('/api/media/stream/:filename', handleMediaFileStream);
  app.head('/api/media/stream/:filename', handleMediaFileStream);
  app.options('/api/media/stream/:filename', handleMediaFileStream);

  // Service Worker and Manifest explicit routes
  app.get('/api/subtitles/:filename', (req, res) => {
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(`WEBVTT

00:00:01.000 --> 00:00:05.000
[NovaStream High Definition Master Playback]

00:00:06.000 --> 00:00:10.000
Verified browser-compatible HTML5 stream active.
`);
  });

  app.get('/sw.js', (req, res) => {
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    res.sendFile(swPath);
  });

  // --- VITE MIDDLEWARE / PRODUCTION STATIC SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NovaStream Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
