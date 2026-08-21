import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  Movie,
  Series,
  Episode,
  Watchlist,
  WatchProgress,
  PaymentRecord,
  SubscriptionRecord,
  AuditLogEntry,
  MediaValidationResult,
  PlaybackErrorLog,
  NotificationItem,
  AdminSettings,
  UserFeedbackRating,
  MediaRatingSummary
} from '../src/types';
import { INITIAL_MOVIES, INITIAL_SERIES } from '../src/data/initialCatalog';
import { isBlacklistedDemoMedia } from '../src/utils/mediaBlacklist';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'novastream_store.json');

export interface AppDatabase {
  users: User[];
  movies: Movie[];
  series: Series[];
  watchlist: Watchlist[];
  watchProgress: WatchProgress[];
  payments: PaymentRecord[];
  subscriptions: SubscriptionRecord[];
  auditLogs: AuditLogEntry[];
  validationLogs: MediaValidationResult[];
  playbackErrors: PlaybackErrorLog[];
  notifications: NotificationItem[];
  ratings?: UserFeedbackRating[];
  settings: AdminSettings;
}

// Initial Admin User based on prompt metadata
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'deephustle231@gmail.com';

function createDefaultData(): AppDatabase {
  const adminId = 'usr-admin-01';
  const defaultAdmin: User = {
    id: adminId,
    email: DEFAULT_ADMIN_EMAIL,
    displayName: 'NovaStream Administrator',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop',
    role: 'admin',
    plan: 'premium',
    subscriptionStatus: 'active',
    subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const demoUser: User = {
    id: 'usr-demo-02',
    email: 'viewer@novastream.tv',
    displayName: 'Cinema Explorer (Free)',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=300&auto=format&fit=crop',
    role: 'user',
    plan: 'free',
    subscriptionStatus: 'inactive',
    subscriptionExpiresAt: null,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  };

  const demoPremiumUser: User = {
    id: 'usr-demo-premium-03',
    email: 'subscriber@novastream.tv',
    displayName: 'Premium Customer (No Admin)',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=300&auto=format&fit=crop',
    role: 'user',
    plan: 'premium',
    subscriptionStatus: 'active',
    subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  };

  const demoExpiredUser: User = {
    id: 'usr-demo-expired-04',
    email: 'expired@novastream.tv',
    displayName: 'Lapsed Customer (Expired)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop',
    role: 'user',
    plan: 'premium',
    subscriptionStatus: 'expired',
    subscriptionExpiresAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  };

  return {
    users: [defaultAdmin, demoUser, demoPremiumUser, demoExpiredUser],
    movies: INITIAL_MOVIES,
    series: INITIAL_SERIES,
    watchlist: [],
    watchProgress: [],
    payments: [],
    subscriptions: [],
    ratings: [],
    auditLogs: [
      {
        id: 'log-init-01',
        actorId: 'system',
        actorEmail: 'system@novastream.internal',
        action: 'SYSTEM_BOOTSTRAP',
        resource: 'Database',
        result: 'SUCCESS',
        details: 'NovaStream database initialized with verified public domain & Creative Commons catalog.',
        timestamp: new Date().toISOString()
      }
    ],
    validationLogs: [],
    playbackErrors: [],
    notifications: [
      {
        id: 'notif-welcome-01',
        userId: adminId,
        title: 'Welcome to NovaStream',
        message: 'Platform initialized. 50+ legally verified titles ready for streaming and administrative management.',
        type: 'system',
        isRead: false,
        createdAt: new Date().toISOString()
      }
    ],
    settings: {
      maintenanceMode: false,
      allowedSignups: true,
      paystackConfigured: Boolean(process.env.PAYSTACK_SECRET_KEY),
      paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
      googleSheetsConfigured: Boolean(process.env.GOOGLE_SHEETS_SPREADSHEET_ID),
      googleSheetsSpreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '',
      autoValidationEnabled: true,
      lastUpdated: new Date().toISOString()
    }
  };
}

class DatabaseStore {
  private data: AppDatabase;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): AppDatabase {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        
        // Load verified movies directly from INITIAL_MOVIES
        const movies: Movie[] = [...INITIAL_MOVIES];

        // Retain only series that have valid episodes and exist in INITIAL_SERIES
        const series: Series[] = INITIAL_SERIES;

        const defaultData = createDefaultData();
        const existingUsers: User[] = parsed.users || [];
        defaultData.users.forEach((u) => {
          const idx = existingUsers.findIndex((eu) => eu.email === u.email || eu.id === u.id);
          if (idx === -1) {
            existingUsers.push(u);
          } else {
            existingUsers[idx] = {
              ...existingUsers[idx],
              displayName: u.displayName,
              role: u.role,
              plan: u.plan,
              subscriptionStatus: u.subscriptionStatus
            };
          }
        });

        const merged: AppDatabase = {
          ...defaultData,
          ...parsed,
          users: existingUsers,
          movies,
          series
        };
        this.saveDirect(merged);
        return merged;
      }
    } catch (err) {
      console.error('Error reading database file, using fallback default data:', err);
    }
    const def = createDefaultData();
    this.saveDirect(def);
    return def;
  }

  private saveDirect(data: AppDatabase) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error persisting database file:', err);
    }
  }

  public save() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveDirect(this.data);
    }, 150);
  }

  // --- USERS ---
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx < 0) return undefined;
    this.data.users[idx] = {
      ...this.data.users[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.users[idx];
  }

  public saveUser(user: User): User {
    const idx = this.data.users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      this.data.users[idx] = { ...user, updatedAt: new Date().toISOString() };
    } else {
      this.data.users.push(user);
    }
    this.save();
    return user;
  }

  // --- MOVIES ---
  public getMovies(includeDisabled = false): Movie[] {
    if (includeDisabled) return this.data.movies;
    return this.data.movies.filter(m => m.availabilityStatus === 'active');
  }

  public getMovieById(id: string): Movie | undefined {
    return this.data.movies.find(m => m.id === id);
  }

  public updateMovie(id: string, updates: Partial<Movie>): Movie | undefined {
    const idx = this.data.movies.findIndex(m => m.id === id);
    if (idx < 0) return undefined;
    this.data.movies[idx] = { ...this.data.movies[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save();
    return this.data.movies[idx];
  }

  public saveMovie(movie: Movie, actorEmail = 'system'): Movie {
    const isNew = !this.data.movies.some(m => m.id === movie.id);
    const idx = this.data.movies.findIndex(m => m.id === movie.id);
    const updatedMovie = { ...movie, updatedAt: new Date().toISOString() };

    if (idx >= 0) {
      this.data.movies[idx] = updatedMovie;
    } else {
      this.data.movies.unshift(updatedMovie);
    }

    this.addAuditLog({
      actorId: 'admin',
      actorEmail,
      action: isNew ? 'CREATE_MOVIE' : 'UPDATE_MOVIE',
      resource: 'Movie',
      resourceId: movie.id,
      result: 'SUCCESS',
      details: `${isNew ? 'Added' : 'Updated'} movie: ${movie.title} (${movie.year})`
    });

    this.save();
    return updatedMovie;
  }

  public deleteMovie(id: string, actorEmail = 'admin'): boolean {
    const movie = this.data.movies.find(m => m.id === id);
    if (!movie) return false;

    this.data.movies = this.data.movies.filter(m => m.id !== id);
    this.addAuditLog({
      actorId: 'admin',
      actorEmail,
      action: 'DELETE_MOVIE',
      resource: 'Movie',
      resourceId: id,
      result: 'SUCCESS',
      details: `Deleted movie: ${movie.title} (${movie.year})`
    });
    this.save();
    return true;
  }

  // --- SERIES & EPISODES ---
  public getSeries(includeDisabled = false): Series[] {
    if (includeDisabled) return this.data.series;
    return this.data.series.filter(s => s.availabilityStatus === 'active');
  }

  public getSeriesById(id: string): Series | undefined {
    return this.data.series.find(s => s.id === id);
  }

  public saveSeries(series: Series, actorEmail = 'admin'): Series {
    const isNew = !this.data.series.some(s => s.id === series.id);
    const idx = this.data.series.findIndex(s => s.id === series.id);
    const updated = { ...series, updatedAt: new Date().toISOString() };

    if (idx >= 0) {
      this.data.series[idx] = updated;
    } else {
      this.data.series.unshift(updated);
    }

    this.addAuditLog({
      actorId: 'admin',
      actorEmail,
      action: isNew ? 'CREATE_SERIES' : 'UPDATE_SERIES',
      resource: 'Series',
      resourceId: series.id,
      result: 'SUCCESS',
      details: `${isNew ? 'Added' : 'Updated'} TV Series: ${series.title}`
    });

    this.save();
    return updated;
  }

  public deleteSeries(id: string, actorEmail = 'admin'): boolean {
    const item = this.data.series.find(s => s.id === id);
    if (!item) return false;

    this.data.series = this.data.series.filter(s => s.id !== id);
    this.addAuditLog({
      actorId: 'admin',
      actorEmail,
      action: 'DELETE_SERIES',
      resource: 'Series',
      resourceId: id,
      result: 'SUCCESS',
      details: `Deleted TV Series: ${item.title}`
    });
    this.save();
    return true;
  }

  // --- WATCHLIST ---
  public getWatchlist(userId: string): Watchlist[] {
    return this.data.watchlist.filter(w => w.userId === userId);
  }

  public addToWatchlist(item: Omit<Watchlist, 'id' | 'createdAt'>): Watchlist {
    const existing = this.data.watchlist.find(
      w => w.userId === item.userId && w.mediaId === item.mediaId
    );
    if (existing) return existing;

    const newItem: Watchlist = {
      ...item,
      id: `wl-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString()
    };
    this.data.watchlist.unshift(newItem);
    this.save();
    return newItem;
  }

  public removeFromWatchlist(userId: string, mediaId: string): boolean {
    const beforeLen = this.data.watchlist.length;
    this.data.watchlist = this.data.watchlist.filter(
      w => !(w.userId === userId && w.mediaId === mediaId)
    );
    this.save();
    return this.data.watchlist.length < beforeLen;
  }

  // --- WATCH PROGRESS / CONTINUE WATCHING ---
  public getWatchProgress(userId: string): WatchProgress[] {
    return this.data.watchProgress
      .filter(wp => wp.userId === userId && !wp.completed && wp.positionSeconds > 10)
      .sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime());
  }

  public saveWatchProgress(progress: Omit<WatchProgress, 'id' | 'lastWatchedAt'>): WatchProgress {
    const idx = this.data.watchProgress.findIndex(
      wp => wp.userId === progress.userId && wp.mediaId === progress.mediaId
    );

    const updated: WatchProgress = {
      ...progress,
      id: idx >= 0 ? this.data.watchProgress[idx].id : `wp-${crypto.randomUUID()}`,
      lastWatchedAt: new Date().toISOString()
    };

    if (idx >= 0) {
      this.data.watchProgress[idx] = updated;
    } else {
      this.data.watchProgress.unshift(updated);
    }
    this.save();
    return updated;
  }

  // --- PAYMENTS & SUBSCRIPTIONS ---
  public getPayments(): PaymentRecord[] {
    return this.data.payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getUserPayments(userId: string): PaymentRecord[] {
    return this.data.payments
      .filter(p => p.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public recordPayment(payment: PaymentRecord): PaymentRecord {
    // Prevent duplicates by reference
    const existing = this.data.payments.find(p => p.reference === payment.reference);
    if (existing) return existing;

    this.data.payments.unshift(payment);
    this.save();
    return payment;
  }

  public getSubscriptions(): SubscriptionRecord[] {
    return this.data.subscriptions;
  }

  public getActiveSubscriptions(): SubscriptionRecord[] {
    const now = new Date().toISOString();
    return this.data.subscriptions.filter(s => s.status === 'active' && s.expiresAt > now);
  }

  public getUserSubscription(userId: string): SubscriptionRecord | undefined {
    return this.data.subscriptions
      .filter(s => s.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }

  public saveSubscription(sub: SubscriptionRecord): SubscriptionRecord {
    const idx = this.data.subscriptions.findIndex(s => s.id === sub.id || s.reference === sub.reference);
    const updated = { ...sub, updatedAt: new Date().toISOString() };

    if (idx >= 0) {
      this.data.subscriptions[idx] = updated;
    } else {
      this.data.subscriptions.unshift(updated);
    }
    this.save();
    return updated;
  }

  // --- MRR & ANALYTICS ---
  public calculateMRR(): { mrr: number; activeSubscribersCount: number; planPrice: number; currency: string } {
    const planPrice = 2500;
    const now = new Date().toISOString();
    const activeSubs = this.data.subscriptions.filter(
      s => s.status === 'active' && s.expiresAt > now
    );
    const activeSubscribersCount = activeSubs.length;
    const mrr = activeSubscribersCount * planPrice;

    return {
      mrr,
      activeSubscribersCount,
      planPrice,
      currency: 'NGN'
    };
  }

  // --- AUDIT LOGS ---
  public getAuditLogs(limit = 100): AuditLogEntry[] {
    return this.data.auditLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  public addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const log: AuditLogEntry = {
      ...entry,
      id: `log-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString()
    };
    this.data.auditLogs.unshift(log);
    // Keep max 1000 logs
    if (this.data.auditLogs.length > 1000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 1000);
    }
    this.save();
    return log;
  }

  // --- MEDIA VALIDATION LOGS ---
  public getValidationLogs(limit = 100): MediaValidationResult[] {
    return this.data.validationLogs
      .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime())
      .slice(0, limit);
  }

  public recordValidation(result: MediaValidationResult) {
    this.data.validationLogs.unshift(result);
    if (this.data.validationLogs.length > 500) {
      this.data.validationLogs = this.data.validationLogs.slice(0, 500);
    }

    // Also update media status in store if exists
    if (result.mediaType === 'movie') {
      const movie = this.data.movies.find(m => m.id === result.mediaId);
      if (movie) {
        movie.mediaValidationStatus = result.status;
        if (result.status === 'INVALID' || result.status === 'UNAVAILABLE') {
          movie.availabilityStatus = 'disabled';
        }
      }
    }
    this.save();
  }

  // --- PLAYBACK ERRORS TELEMETRY ---
  public recordPlaybackError(error: Omit<PlaybackErrorLog, 'id' | 'reportedAt'>): PlaybackErrorLog {
    const item: PlaybackErrorLog = {
      ...error,
      id: `pberr-${crypto.randomUUID()}`,
      reportedAt: new Date().toISOString()
    };
    this.data.playbackErrors.unshift(item);
    if (this.data.playbackErrors.length > 500) {
      this.data.playbackErrors = this.data.playbackErrors.slice(0, 500);
    }
    this.save();
    return item;
  }

  public getPlaybackErrors(limit = 100): PlaybackErrorLog[] {
    return this.data.playbackErrors.slice(0, limit);
  }

  // --- NOTIFICATIONS ---
  public getNotifications(userId: string): NotificationItem[] {
    return this.data.notifications
      .filter(n => n.userId === userId || n.userId === 'all')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createNotification(notif: Omit<NotificationItem, 'id' | 'createdAt'>): NotificationItem {
    const item: NotificationItem = {
      ...notif,
      id: `notif-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString()
    };
    this.data.notifications.unshift(item);
    this.save();
    return item;
  }

  public markNotificationRead(id: string, userId: string): boolean {
    const notif = this.data.notifications.find(n => n.id === id && (n.userId === userId || n.userId === 'all'));
    if (notif) {
      notif.isRead = true;
      this.save();
      return true;
    }
    return false;
  }

  // --- USER RATINGS ---
  public getRatingSummary(mediaId: string, userId?: string): MediaRatingSummary {
    if (!this.data.ratings) this.data.ratings = [];
    const mediaRatings = this.data.ratings.filter(r => r.mediaId === mediaId);
    const userRatingObj = userId ? mediaRatings.find(r => r.userId === userId) : undefined;
    
    // Default baseline rating if few ratings exist
    let totalScore = mediaRatings.reduce((sum, r) => sum + r.score, 0);
    let totalCount = mediaRatings.length;

    let average = totalCount > 0 ? Number((totalScore / totalCount).toFixed(1)) : 4.8;

    return {
      mediaId,
      averageRating: average,
      totalRatings: totalCount,
      userRating: userRatingObj?.score
    };
  }

  public submitRating(mediaId: string, userId: string, score: number): MediaRatingSummary {
    if (!this.data.ratings) this.data.ratings = [];
    const clampedScore = Math.max(1, Math.min(5, Math.round(score)));
    const existingIdx = this.data.ratings.findIndex(r => r.mediaId === mediaId && r.userId === userId);
    
    const entry: UserFeedbackRating = {
      id: `rate-${crypto.randomUUID()}`,
      mediaId,
      userId,
      score: clampedScore,
      updatedAt: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      this.data.ratings[existingIdx] = entry;
    } else {
      this.data.ratings.push(entry);
    }

    this.save();
    return this.getRatingSummary(mediaId, userId);
  }

  // --- SETTINGS ---
  public getSettings(): AdminSettings {
    return {
      ...this.data.settings,
      paystackConfigured: Boolean(process.env.PAYSTACK_SECRET_KEY),
      paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
      googleSheetsConfigured: Boolean(process.env.GOOGLE_SHEETS_SPREADSHEET_ID)
    };
  }

  public updateSettings(settings: Partial<AdminSettings>, actorEmail = 'admin'): AdminSettings {
    this.data.settings = {
      ...this.data.settings,
      ...settings,
      lastUpdated: new Date().toISOString()
    };
    this.addAuditLog({
      actorId: 'admin',
      actorEmail,
      action: 'UPDATE_SETTINGS',
      resource: 'PlatformSettings',
      result: 'SUCCESS',
      details: 'Updated administrative and integration platform settings.'
    });
    this.save();
    return this.getSettings();
  }
}

export const dbStore = new DatabaseStore();
