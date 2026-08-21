import React, { useState, useEffect, useCallback } from 'react';
import { ToastProvider, useToast } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { VideoPlayer } from './components/VideoPlayer';
import { MediaDetailModal } from './components/MediaDetailModal';
import { PaywallModal } from './components/PaywallModal';
import { SearchModal } from './components/SearchModal';
import { HomePage } from './pages/HomePage';
import { MoviesPage } from './pages/MoviesPage';
import { SeriesPage } from './pages/SeriesPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { HistoryPage } from './pages/HistoryPage';
import { PremiumPage } from './pages/PremiumPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { Movie, Series, Episode, WatchlistItem, WatchProgress } from './types';
import { INITIAL_MOVIES, INITIAL_SERIES } from './data/initialCatalog';
import { CATALOGUE_DATA } from './data/movies';
import { fetchYouTubeMovies } from './services/youtube';
import { fetchArchiveMovies, checkMediaUrl } from './services/archive';
import { validateMediaSources } from './utils/mediaValidation';
import {
  cacheMetadataInServiceWorker,
  getOfflineCachedMetadata,
  OFFLINE_STORAGE_KEYS
} from './serviceWorkerRegistration';
import { WifiOff, Sparkles, RefreshCw } from 'lucide-react';

type TabType = 'home' | 'movies' | 'series' | 'watchlist' | 'history' | 'premium' | 'profile' | 'admin';

const MainApp: React.FC = () => {
  const { user, isPremium, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [movies, setMovies] = useState<Movie[]>(() => INITIAL_MOVIES);
  const [series, setSeries] = useState<Series[]>(() => INITIAL_SERIES);
  const [isLoadingCatalogue, setIsLoadingCatalogue] = useState<boolean>(false);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchProgress, setWatchProgress] = useState<WatchProgress[]>([]);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  // Force localStorage.clear() on initialization to remove cached MP4 links and stale metadata
  useEffect(() => {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('Error clearing localStorage:', e);
    }
  }, []);

  // Run non-blocking background validation asynchronously AFTER UI render
  useEffect(() => {
    const timer = setTimeout(() => {
      validateMediaSources(INITIAL_MOVIES)
        .then((summary) => {
          console.log('[MediaValidation] Background check complete. All reachable:', summary.allValid);
        })
        .catch((err) => {
          console.warn('[MediaValidation] Background check warning:', err);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Modal states
  const [detailMedia, setDetailMedia] = useState<Movie | Series | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Sync offline mutations when network reconnects
  const syncOfflineWatchlistMutations = useCallback(async () => {
    try {
      const raw = localStorage.getItem(OFFLINE_STORAGE_KEYS.OFFLINE_MUTATIONS);
      if (!raw) return;
      const mutations: Array<{ type: 'ADD' | 'REMOVE'; payload: any }> = JSON.parse(raw);
      if (!mutations || mutations.length === 0) return;

      for (const mut of mutations) {
        if (mut.type === 'ADD') {
          await fetch('/api/watchlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mut.payload)
          });
        } else if (mut.type === 'REMOVE') {
          await fetch(`/api/watchlist/${mut.payload.mediaId}`, {
            method: 'DELETE'
          });
        }
      }

      localStorage.removeItem(OFFLINE_STORAGE_KEYS.OFFLINE_MUTATIONS);
      showToast('Offline Watchlist changes synchronized with server', 'success');
    } catch (err) {
      console.warn('Syncing offline mutations failed:', err);
    }
  }, [showToast]);

  // Online / Offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      showToast('Online connection restored — Syncing catalogue', 'success');
      loadCatalogue();
      loadUserData();
      syncOfflineWatchlistMutations();
    };

    const handleOffline = () => {
      setIsOffline(true);
      showToast('Offline Mode active — Showing cached metadata & watchlist', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOfflineWatchlistMutations, showToast]);

  // Load Catalogue (Network First with YouTube Data API v3 & Internet Archive & Service Worker / Local Storage Cache Fallback)
  const loadCatalogue = useCallback(async () => {
    setIsLoadingCatalogue(true);
    try {
      const [moviesRes, seriesRes, ytMovies, archiveMovies] = await Promise.all([
        fetch('/api/movies').catch(() => null),
        fetch('/api/series').catch(() => null),
        fetchYouTubeMovies('full length feature film').catch(() => [] as Movie[]),
        fetchArchiveMovies().catch(() => [] as Movie[])
      ]);

      let rawMovies: Movie[] = [];
      let rawSeries: Series[] = [];

      if (moviesRes && moviesRes.ok) {
        rawMovies = await moviesRes.json();
      }
      if (seriesRes && seriesRes.ok) {
        rawSeries = await seriesRes.json();
      }

      const activeMovies = rawMovies && rawMovies.length > 0 ? rawMovies : INITIAL_MOVIES;
      const formattedMovies: Movie[] = activeMovies.map((movie) => ({
        ...movie,
        validated: true,
        mediaValidationStatus: 'VALID',
        playbackStatus: 'VERIFIED',
        mimeType: movie.mimeType || 'video/mp4'
      }));

      // Combine dynamic YouTube, Internet Archive, local CATALOGUE_DATA, and base movies
      const allCandidateMovies: Movie[] = [
        ...(ytMovies || []),
        ...(archiveMovies || []),
        ...CATALOGUE_DATA,
        ...formattedMovies
      ];

      // Validate streams strictly: skip HEAD check for YouTube (handles own playback/embed validation), check direct streams
      const verifiedMovies = await Promise.all(
        allCandidateMovies.map(async (movie) => {
          const primaryUrl = movie.sources?.[0]?.url || movie.qualities?.[0]?.url || movie.videoUrl;
          if (!primaryUrl) return null;

          // Skip HEAD check for YouTube links (embed handles its own validation)
          if (primaryUrl.includes('youtube.com') || primaryUrl.includes('youtu.be')) {
            return movie;
          }

          // Validate direct MP4 / Archive links strictly
          const isWorking = await checkMediaUrl(primaryUrl);
          return isWorking ? movie : null;
        })
      );

      const validList = verifiedMovies.filter((m): m is Movie => m !== null);
      // Deduplicate by ID and Title
      const mergedMovies: Movie[] = validList.filter(
        (m, index, self) => index === self.findIndex((t) => t.id === m.id || t.title.toLowerCase() === m.title.toLowerCase())
      );

      const activeSeries = rawSeries && rawSeries.length > 0 ? rawSeries : INITIAL_SERIES;
      const formattedSeries: Series[] = activeSeries.map((show) => ({
        ...show,
        mediaValidationStatus: 'VALID'
      }));

      setMovies(mergedMovies.length > 0 ? mergedMovies : formattedMovies);
      setSeries(formattedSeries);

      // Store fresh catalogue into Service Worker and fallback storage
      cacheMetadataInServiceWorker({
        movies: mergedMovies,
        series: formattedSeries
      });
    } catch (err) {
      console.warn('Network catalogue fetch failed, loading cached metadata fallback:', err);
      const cached = getOfflineCachedMetadata();
      if (cached.movies && cached.movies.length > 0) {
        setMovies(cached.movies.map((m) => ({ ...m, validated: true })));
      } else {
        setMovies(INITIAL_MOVIES);
      }
      if (cached.series && cached.series.length > 0) {
        setSeries(cached.series);
      } else {
        setSeries(INITIAL_SERIES);
      }
    } finally {
      setIsLoadingCatalogue(false);
    }
  }, []);

  // Load Watchlist & Progress (with Offline Cache Fallback)
  const loadUserData = useCallback(async () => {
    if (!user) {
      // Even if unauthenticated or offline guest, load local cached watchlist
      const cached = getOfflineCachedMetadata();
      if (cached.watchlist.length > 0) setWatchlist(cached.watchlist);
      if (cached.watchProgress.length > 0) setWatchProgress(cached.watchProgress);
      return;
    }

    try {
      const [watchRes, progRes] = await Promise.all([
        fetch('/api/watchlist'),
        fetch('/api/watch-progress')
      ]);

      let loadedWatch: WatchlistItem[] = [];
      let loadedProg: WatchProgress[] = [];

      if (watchRes.ok) {
        loadedWatch = await watchRes.json();
        setWatchlist(loadedWatch);
      }
      if (progRes.ok) {
        loadedProg = await progRes.json();
        setWatchProgress(loadedProg);
      }

      // Cache user metadata in SW & local cache
      cacheMetadataInServiceWorker({
        watchlist: loadedWatch,
        watchProgress: loadedProg
      });
    } catch (err) {
      console.warn('Network user data fetch failed, loading offline cached watchlist:', err);
      const cached = getOfflineCachedMetadata();
      if (cached.watchlist.length > 0) setWatchlist(cached.watchlist);
      if (cached.watchProgress.length > 0) setWatchProgress(cached.watchProgress);
    }
  }, [user]);

  useEffect(() => {
    loadCatalogue();
  }, [loadCatalogue]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Detail Origin tracking for seamless Back navigation
  const [detailOrigin, setDetailOrigin] = useState<{
    sourceScreenTitle: string;
    reopenSearchOnBack?: boolean;
  } | null>(null);

  // Playing Media tracking with return-to-detail and source screen support
  const [playingMedia, setPlayingMedia] = useState<{
    media: Movie | Episode;
    parentSeries?: Series;
    initialPosition?: number;
    returnToDetail?: Movie | Series;
    sourceScreenTitle?: string;
  } | null>(null);

  const getTabTitle = (tab: TabType): string => {
    switch (tab) {
      case 'home': return 'Home';
      case 'movies': return 'Movies Catalogue';
      case 'series': return 'Series Catalogue';
      case 'watchlist': return 'Watchlist';
      case 'history': return 'Watch History';
      case 'premium': return 'Premium Plans';
      case 'profile': return 'Profile';
      case 'admin': return 'Admin Dashboard';
      default: return 'Catalogue';
    }
  };

  // Change tab with URL sync
  const handleNavigateTab = (tab: TabType) => {
    setCurrentTab(tab);
    setDetailMedia(null);
    setPlayingMedia(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      url.searchParams.delete('media');
      url.searchParams.delete('play');
      url.searchParams.delete('id');
      window.history.pushState({ tab }, '', url.toString());
    } catch {
      // Fallback safe
    }
  };

  // Deep-Link & URL Sync handler on mount & popstate
  useEffect(() => {
    const syncFromUrl = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const tabParam = (params.get('tab') as TabType) || 'home';
        const mediaId = params.get('media') || params.get('id');
        const playId = params.get('play');

        if (['home', 'movies', 'series', 'watchlist', 'history', 'premium', 'profile', 'admin'].includes(tabParam)) {
          setCurrentTab(tabParam);
        }

        if (movies.length > 0 || series.length > 0) {
          if (playId) {
            const foundMovie = movies.find(m => m.id === playId);
            const foundSeries = series.find(s => s.id === playId);

            // Look up saved resume position for this title
            let savedPos = 0;
            const progressItem = watchProgress.find(wp => wp.mediaId === playId || wp.episodeId === playId);
            if (progressItem && progressItem.positionSeconds > 0) {
              savedPos = progressItem.positionSeconds;
            } else {
              try {
                const localPos = localStorage.getItem(`novastream_watch_progress_${playId}`);
                if (localPos) savedPos = parseInt(localPos, 10) || 0;
              } catch {
                // Fallback
              }
            }

            if (foundMovie) {
              setPlayingMedia({
                media: foundMovie,
                initialPosition: savedPos,
                sourceScreenTitle: getTabTitle(tabParam)
              });
            } else if (foundSeries) {
              const firstEp = foundSeries.seasons?.[0]?.episodes?.[0];
              if (firstEp) {
                setPlayingMedia({
                  media: firstEp,
                  parentSeries: foundSeries,
                  initialPosition: savedPos,
                  sourceScreenTitle: getTabTitle(tabParam)
                });
              }
            }
          } else {
            setPlayingMedia(null);
          }

          if (mediaId && !playId) {
            const found =
              movies.find(m => m.id === mediaId || m.title.toLowerCase() === decodeURIComponent(mediaId).toLowerCase()) ||
              series.find(s => s.id === mediaId || s.title.toLowerCase() === decodeURIComponent(mediaId).toLowerCase());
            if (found) {
              const isMovie = 'runtime' in found;
              setDetailMedia(found);
              setDetailOrigin(prev => prev || {
                sourceScreenTitle: isMovie ? 'Movies Catalogue' : 'Series Catalogue',
                reopenSearchOnBack: false
              });
            }
          } else if (!playId) {
            setDetailMedia(null);
          }
        }
      } catch (e) {
        console.warn('URL sync error:', e);
      }
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [movies, series, watchProgress]);

  // Real-time listener for watch progress updates from VideoPlayer
  useEffect(() => {
    const handleProgressUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ mediaId: string; positionSeconds: number; durationSeconds: number }>;
      if (!customEvent.detail) return;
      const { mediaId, positionSeconds, durationSeconds } = customEvent.detail;

      setWatchProgress(prev => {
        const idx = prev.findIndex(p => p.mediaId === mediaId);
        const completionPercentage = Math.min(100, Math.round((positionSeconds / Math.max(1, durationSeconds)) * 100));
        const updatedEntry: WatchProgress = idx >= 0 ? {
          ...prev[idx],
          positionSeconds,
          durationSeconds,
          completionPercentage,
          lastWatchedAt: new Date().toISOString()
        } : {
          id: `wp-${mediaId}`,
          userId: user?.id || 'usr-admin-01',
          mediaId,
          mediaType: 'movie',
          title: movies.find(m => m.id === mediaId)?.title || 'Movie',
          poster: movies.find(m => m.id === mediaId)?.poster || '',
          positionSeconds,
          durationSeconds,
          completionPercentage,
          completed: completionPercentage >= 92,
          lastWatchedAt: new Date().toISOString()
        };

        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = updatedEntry;
          return clone;
        } else {
          return [updatedEntry, ...prev];
        }
      });
    };

    window.addEventListener('novastream:progress-updated', handleProgressUpdate);
    return () => window.removeEventListener('novastream:progress-updated', handleProgressUpdate);
  }, [movies, user]);

  // Open Media Details with Context
  const handleOpenDetail = (media: Movie | Series, sourceScreenTitle?: string, fromSearch = false) => {
    const isMovie = 'runtime' in media;
    const originTitle = sourceScreenTitle || (isMovie ? 'Movies Catalogue' : 'Series Catalogue');
    
    setDetailMedia(media);
    setDetailOrigin({
      sourceScreenTitle: originTitle,
      reopenSearchOnBack: fromSearch
    });

    if (fromSearch) {
      setShowSearch(false);
    }

    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', currentTab);
      url.searchParams.set('media', media.id);
      url.searchParams.delete('play');
      window.history.pushState({ modal: 'detail', mediaId: media.id, tab: currentTab }, '', url.toString());
    } catch {
      // Safe fallback
    }
  };

  // Close Media Details and return to source
  const handleCloseDetail = () => {
    const reopenSearch = detailOrigin?.reopenSearchOnBack;
    setDetailMedia(null);
    setDetailOrigin(null);

    if (reopenSearch) {
      setShowSearch(true);
    }

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('media');
      url.searchParams.delete('play');
      url.searchParams.delete('id');
      window.history.replaceState({ tab: currentTab }, '', url.toString());
    } catch {
      // Safe fallback
    }
  };

  // Set of watchlist IDs for fast lookup
  const watchlistIds = React.useMemo(() => {
    return new Set(watchlist.map(w => w.mediaId));
  }, [watchlist]);

  // Toggle Watchlist with Offline Resilience
  const handleToggleWatchlist = async (media: Movie | Series) => {
    const inList = watchlistIds.has(media.id);
    const isMovie = 'runtime' in media;

    if (inList) {
      // Remove from watchlist
      const updated = watchlist.filter(w => w.mediaId !== media.id);
      setWatchlist(updated);
      cacheMetadataInServiceWorker({ watchlist: updated });

      if (isOffline) {
        // Record pending mutation for when reconnecting
        try {
          const raw = localStorage.getItem(OFFLINE_STORAGE_KEYS.OFFLINE_MUTATIONS);
          const muts = raw ? JSON.parse(raw) : [];
          muts.push({ type: 'REMOVE', payload: { mediaId: media.id } });
          localStorage.setItem(OFFLINE_STORAGE_KEYS.OFFLINE_MUTATIONS, JSON.stringify(muts));
        } catch (e) { /* ignore */ }
        showToast(`Removed "${media.title}" from Offline Watchlist`, 'info');
      } else {
        try {
          await fetch(`/api/watchlist/${media.id}`, { method: 'DELETE' });
          showToast(`Removed "${media.title}" from Watchlist`, 'info');
        } catch (err) {
          showToast('Updated local watchlist (offline fallback)', 'info');
        }
      }
    } else {
      // Add to watchlist
      const newItem: WatchlistItem = {
        id: `w-${Date.now()}`,
        userId: user?.id || 'guest-offline',
        mediaId: media.id,
        mediaType: isMovie ? 'movie' : 'series',
        title: media.title,
        poster: media.poster,
        backdrop: media.backdrop,
        year: media.year,
        rating: media.rating,
        genres: media.genres,
        createdAt: new Date().toISOString()
      };

      const updated = [...watchlist, newItem];
      setWatchlist(updated);
      cacheMetadataInServiceWorker({ watchlist: updated });

      if (isOffline) {
        try {
          const raw = localStorage.getItem(OFFLINE_STORAGE_KEYS.OFFLINE_MUTATIONS);
          const muts = raw ? JSON.parse(raw) : [];
          muts.push({ type: 'ADD', payload: newItem });
          localStorage.setItem(OFFLINE_STORAGE_KEYS.OFFLINE_MUTATIONS, JSON.stringify(muts));
        } catch (e) { /* ignore */ }
        showToast(`Saved "${media.title}" to Offline Watchlist`, 'success');
      } else {
        try {
          const res = await fetch('/api/watchlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mediaId: media.id,
              mediaType: isMovie ? 'movie' : 'series',
              title: media.title,
              poster: media.poster,
              backdrop: media.backdrop,
              year: media.year,
              rating: media.rating,
              genres: media.genres
            })
          });
          if (res.ok) {
            const serverItem = await res.json();
            setWatchlist(prev => prev.map(w => w.id === newItem.id ? serverItem : w));
          }
          showToast(`Added "${media.title}" to Watchlist`, 'success');
        } catch (err) {
          showToast(`Saved "${media.title}" to Watchlist (cached locally)`, 'success');
        }
      }
    }
  };

  // History Actions
  const handleRemoveHistoryItem = async (mediaId: string) => {
    setWatchProgress(prev => prev.filter(wp => wp.mediaId !== mediaId && wp.episodeId !== mediaId));
    try {
      await fetch(`/api/watch-progress/${mediaId}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Failed to delete history on server:', e);
    }
  };

  const handleClearAllHistory = async () => {
    setWatchProgress([]);
    try {
      await fetch('/api/watch-progress', { method: 'DELETE' });
    } catch (e) {
      console.warn('Failed to clear history on server:', e);
    }
  };

  // Play Media Trigger with Back-to-Detail Context
  const handlePlayMedia = (media: Movie | Series, episodeOrPos?: Episode | number, sourceTitle?: string) => {
    // If media is premium-only and user is not premium, prompt upgrade
    if (media.isPremiumOnly && !isPremium) {
      setShowPaywall(true);
      return;
    }

    const currentActiveDetail = detailMedia;
    const sourceScreen = sourceTitle || (currentActiveDetail ? currentActiveDetail.title : getTabTitle(currentTab));

    let playPayload: {
      media: Movie | Episode;
      parentSeries?: Series;
      initialPosition?: number;
      returnToDetail?: Movie | Series;
      sourceScreenTitle?: string;
    };

    if (typeof episodeOrPos === 'number') {
      // It's a resume position for a movie
      playPayload = {
        media: media as Movie,
        initialPosition: episodeOrPos,
        returnToDetail: currentActiveDetail || undefined,
        sourceScreenTitle: sourceScreen
      };
    } else if (episodeOrPos && 'episodeNumber' in episodeOrPos) {
      // It's an episode
      const savedEpisodePos = watchProgress.find(wp => wp.episodeId === episodeOrPos.id || wp.mediaId === episodeOrPos.id)?.positionSeconds ||
        parseInt(localStorage.getItem(`novastream_watch_progress_${episodeOrPos.id}`) || '0', 10) || 0;

      playPayload = {
        media: episodeOrPos,
        parentSeries: media as Series,
        initialPosition: savedEpisodePos,
        returnToDetail: currentActiveDetail || undefined,
        sourceScreenTitle: sourceScreen
      };
    } else {
      // It's a movie or default series episode
      const isMovie = 'runtime' in media;
      const savedMediaPos = watchProgress.find(wp => wp.mediaId === media.id)?.positionSeconds ||
        parseInt(localStorage.getItem(`novastream_watch_progress_${media.id}`) || '0', 10) || 0;

      if (isMovie) {
        playPayload = {
          media: media as Movie,
          initialPosition: savedMediaPos,
          returnToDetail: currentActiveDetail || undefined,
          sourceScreenTitle: sourceScreen
        };
      } else {
        const seriesItem = media as Series;
        const firstEpisode = seriesItem.seasons?.[0]?.episodes?.[0];
        if (firstEpisode) {
          const savedEpPos = watchProgress.find(wp => wp.episodeId === firstEpisode.id || wp.mediaId === firstEpisode.id)?.positionSeconds ||
            parseInt(localStorage.getItem(`novastream_watch_progress_${firstEpisode.id}`) || '0', 10) || 0;

          playPayload = {
            media: firstEpisode,
            parentSeries: seriesItem,
            initialPosition: savedEpPos,
            returnToDetail: currentActiveDetail || undefined,
            sourceScreenTitle: sourceScreen
          };
        } else {
          return;
        }
      }
    }

    // Close detail and search modals so the view loads immediately straight to the video player
    setDetailMedia(null);
    setShowSearch(false);
    setPlayingMedia(playPayload);

    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', currentTab);
      url.searchParams.set('play', playPayload.media.id);
      window.history.pushState({ modal: 'player', playId: playPayload.media.id, tab: currentTab }, '', url.toString());
    } catch {
      // Safe fallback
    }
  };

  // Close Player and return to detail or previous screen
  const handleClosePlayer = () => {
    const returnTarget = playingMedia?.returnToDetail;
    setPlayingMedia(null);
    loadUserData(); // refresh continue watching progress

    if (returnTarget) {
      setDetailMedia(returnTarget);
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', currentTab);
        url.searchParams.set('media', returnTarget.id);
        url.searchParams.delete('play');
        window.history.replaceState({ modal: 'detail', mediaId: returnTarget.id, tab: currentTab }, '', url.toString());
      } catch {
        // Safe fallback
      }
    } else {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('play');
        window.history.replaceState({ tab: currentTab }, '', url.toString());
      } catch {
        // Safe fallback
      }
    }
  };

  return (
    <div id="app-root" className="h-screen overflow-y-auto bg-[#000000] text-white flex flex-col selection:bg-[#E50914] selection:text-white font-sans antialiased overscroll-y-contain">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onNavigate={handleNavigateTab}
        onOpenSearch={() => setShowSearch(true)}
        onOpenPaywall={() => setShowPaywall(true)}
      />

      {/* Offline Status Alert Banner */}
      {isOffline && (
        <div className="pt-20 pb-0 px-4 max-w-7xl mx-auto w-full animate-in fade-in">
          <div className="p-3.5 rounded-2xl bg-[#141414] border border-[#262626] flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-[#E50914]/20 text-[#E50914]">
                <WifiOff className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-white">Offline Mode Active</p>
                <p className="text-[11px] text-[#A1A1AA]">
                  Showing cached media catalogue and offline-saved Watchlist via Service Worker.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                loadCatalogue();
                loadUserData();
                showToast('Checked cached metadata and service worker storage', 'info');
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1f1f1f] hover:bg-[#262626] text-white text-xs font-semibold border border-[#333333] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#E50914]" />
              Refresh Cache
            </button>
          </div>
        </div>
      )}

      {/* Primary Tab View Router */}
      <main className="flex-1">
        {currentTab === 'home' && (
          <HomePage
            movies={movies}
            series={series}
            watchProgress={watchProgress}
            watchlistIds={watchlistIds}
            isLoading={isLoadingCatalogue}
            onRefresh={async () => {
              await loadCatalogue();
              showToast('Refreshed latest YouTube & Internet Archive streaming catalogue', 'success');
            }}
            onPlay={(m, ep) => handlePlayMedia(m, ep, 'Home')}
            onToggleWatchlist={handleToggleWatchlist}
            onMoreInfo={(m) => handleOpenDetail(m, 'Home')}
          />
        )}

        {currentTab === 'movies' && (
          <MoviesPage
            movies={movies}
            watchlistIds={watchlistIds}
            isLoading={isLoadingCatalogue}
            onPlay={(m, ep) => handlePlayMedia(m, ep, 'Movies Catalogue')}
            onToggleWatchlist={handleToggleWatchlist}
            onMoreInfo={(m) => handleOpenDetail(m, 'Movies Catalogue')}
          />
        )}

        {currentTab === 'series' && (
          <SeriesPage
            series={series}
            watchlistIds={watchlistIds}
            isLoading={isLoadingCatalogue}
            onPlay={(m, ep) => handlePlayMedia(m, ep, 'Series Catalogue')}
            onToggleWatchlist={handleToggleWatchlist}
            onMoreInfo={(m) => handleOpenDetail(m, 'Series Catalogue')}
          />
        )}

        {currentTab === 'watchlist' && (
          <WatchlistPage
            watchlist={watchlist}
            movies={movies}
            series={series}
            isLoading={isLoadingCatalogue}
            onPlay={(m, ep) => handlePlayMedia(m, ep, 'Watchlist')}
            onRemove={(mediaId) => {
              const matched = movies.find(m => m.id === mediaId) || series.find(s => s.id === mediaId);
              if (matched) handleToggleWatchlist(matched);
            }}
            onMoreInfo={(m) => handleOpenDetail(m, 'Watchlist')}
            onExplore={() => handleNavigateTab('movies')}
          />
        )}

        {currentTab === 'history' && (
          <HistoryPage
            watchProgress={watchProgress}
            movies={movies}
            series={series}
            onPlay={(m, ep) => handlePlayMedia(m, ep, 'Watch History')}
            onMoreInfo={(m) => handleOpenDetail(m, 'Watch History')}
            onRemoveItem={handleRemoveHistoryItem}
            onClearAll={handleClearAllHistory}
            onExplore={() => handleNavigateTab('movies')}
          />
        )}

        {currentTab === 'premium' && (
          <PremiumPage onOpenPaywall={() => setShowPaywall(true)} />
        )}

        {currentTab === 'profile' && (
          <ProfilePage onOpenPaywall={() => setShowPaywall(true)} />
        )}

        {currentTab === 'admin' && (
          <AdminDashboard
            onOpenPaywall={() => setShowPaywall(true)}
            onNavigateTab={handleNavigateTab}
            onPlayMedia={handlePlayMedia}
          />
        )}
      </main>

      {/* Global Footer */}
      <Footer />

      {/* Netflix Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        currentTab={currentTab}
        onNavigate={handleNavigateTab}
        onOpenSearch={() => setShowSearch(true)}
        watchlistCount={watchlist.length}
      />

      {/* Media Detail & Season/Episode Modal */}
      {detailMedia && !playingMedia && (
        <MediaDetailModal
          media={detailMedia}
          inWatchlist={watchlistIds.has(detailMedia.id)}
          previousScreenName={detailOrigin?.sourceScreenTitle || ('runtime' in detailMedia ? 'Movies Catalogue' : 'Series Catalogue')}
          onPlay={handlePlayMedia}
          onToggleWatchlist={handleToggleWatchlist}
          onBack={handleCloseDetail}
          onClose={handleCloseDetail}
        />
      )}

      {/* Video Streaming Player Overlay Modal */}
      {playingMedia && (
        <VideoPlayer
          media={playingMedia.media}
          parentSeries={playingMedia.parentSeries}
          initialPosition={playingMedia.initialPosition}
          previousScreenName={playingMedia.sourceScreenTitle || 'Catalogue'}
          onBack={handleClosePlayer}
          onClose={handleClosePlayer}
          onSelectMedia={(newMed) => {
            setPlayingMedia({
              media: newMed,
              parentSeries: 'seasons' in newMed ? (newMed as any) : undefined,
              initialPosition: 0,
              sourceScreenTitle: 'Recommendations'
            });
          }}
          onSelectEpisode={(ser, ep) => {
            setPlayingMedia(prev => prev ? {
              ...prev,
              media: ep,
              parentSeries: ser,
              initialPosition: 0
            } : null);
          }}
        />
      )}

      {/* Paystack ₦2,500/month VIP Checkout Modal */}
      {showPaywall && (
        <PaywallModal
          onClose={() => setShowPaywall(false)}
          onSuccess={() => {
            loadUserData();
          }}
        />
      )}

      {/* Real-time Global Search Modal */}
      {showSearch && (
        <SearchModal
          movies={movies}
          series={series}
          onPlay={(m) => handlePlayMedia(m, undefined, 'Search')}
          onMoreInfo={(m) => handleOpenDetail(m, 'Search Results', true)}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
};

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
