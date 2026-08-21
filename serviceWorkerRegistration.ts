import { Movie, Series, WatchlistItem, WatchProgress } from './types';

// Storage keys for secondary robust client-side offline persistence fallback
export const OFFLINE_STORAGE_KEYS = {
  MOVIES: 'novastream_offline_movies_cache',
  SERIES: 'novastream_offline_series_cache',
  WATCHLIST: 'novastream_offline_watchlist_cache',
  WATCH_PROGRESS: 'novastream_offline_watch_progress_cache',
  OFFLINE_MUTATIONS: 'novastream_offline_pending_watchlist_mutations',
};

let registrationInstance: ServiceWorkerRegistration | null = null;

/**
 * Register the Service Worker in supporting browsers
 */
export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }

  // Use window load to ensure critical page rendering finishes first
  return new Promise((resolve) => {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        registrationInstance = registration;
        console.log('[NovaStream SW] Registered successfully with scope:', registration.scope);

        // Check for updates
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('[NovaStream SW] New content available; please refresh.');
              } else {
                console.log('[NovaStream SW] Content is cached for offline use.');
              }
            }
          };
        };

        resolve(registration);
      } catch (error) {
        console.warn('[NovaStream SW] Registration failed:', error);
        resolve(null);
      }
    });
  });
}

/**
 * Send metadata payload to SW to populate or refresh cache
 */
export function cacheMetadataInServiceWorker(data: {
  movies?: Movie[];
  series?: Series[];
  watchlist?: WatchlistItem[];
  watchProgress?: WatchProgress[];
}) {
  // 1. Post to Active Service Worker if available
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_CORE_METADATA',
      ...data
    });
  }

  // 2. Also persist to localStorage as an immediate synchronous fallback
  try {
    // Note: movie caching in localStorage is disabled to avoid stale catalogue state
    if (data.series && data.series.length > 0) {
      localStorage.setItem(OFFLINE_STORAGE_KEYS.SERIES, JSON.stringify(data.series));
    }
    if (data.watchlist) {
      localStorage.setItem(OFFLINE_STORAGE_KEYS.WATCHLIST, JSON.stringify(data.watchlist));
    }
    if (data.watchProgress) {
      localStorage.setItem(OFFLINE_STORAGE_KEYS.WATCH_PROGRESS, JSON.stringify(data.watchProgress));
    }
  } catch (err) {
    console.warn('[OfflineStorage] Failed to write fallback cache:', err);
  }
}

/**
 * Read cached catalogue and watchlist from fallback storage if network or SW is unavailable
 */
export function getOfflineCachedMetadata(): {
  movies: Movie[];
  series: Series[];
  watchlist: WatchlistItem[];
  watchProgress: WatchProgress[];
} {
  try {
    const rawSeries = localStorage.getItem(OFFLINE_STORAGE_KEYS.SERIES);
    const rawWatchlist = localStorage.getItem(OFFLINE_STORAGE_KEYS.WATCHLIST);
    const rawProgress = localStorage.getItem(OFFLINE_STORAGE_KEYS.WATCH_PROGRESS);

    return {
      movies: [],
      series: rawSeries ? JSON.parse(rawSeries) : [],
      watchlist: rawWatchlist ? JSON.parse(rawWatchlist) : [],
      watchProgress: rawProgress ? JSON.parse(rawProgress) : []
    };
  } catch (e) {
    return { movies: [], series: [], watchlist: [], watchProgress: [] };
  }
}

/**
 * Unregister the service worker if needed
 */
export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.unregister();
  }
}
