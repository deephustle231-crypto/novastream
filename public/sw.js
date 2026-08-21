// NovaStream Cinematic Service Worker
// Version: 1.0.0
const CACHE_NAME_PREFIX = 'novastream';
const SHELL_CACHE = `${CACHE_NAME_PREFIX}-shell-v1`;
const METADATA_CACHE = `${CACHE_NAME_PREFIX}-metadata-v1`;
const POSTERS_CACHE = `${CACHE_NAME_PREFIX}-posters-v1`;

const STATIC_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install Event - Pre-cache minimal app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.addAll(STATIC_SHELL_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Pre-caching static assets non-blocking warning:', err);
      });
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (
            key.startsWith(CACHE_NAME_PREFIX) &&
            key !== SHELL_CACHE &&
            key !== METADATA_CACHE &&
            key !== POSTERS_CACHE
          ) {
            console.log('[ServiceWorker] Purging old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Helper: check if request is for API metadata
function isApiMetadataRequest(url) {
  return (
    url.pathname.startsWith('/api/movies') ||
    url.pathname.startsWith('/api/series') ||
    url.pathname.startsWith('/api/watchlist') ||
    url.pathname.startsWith('/api/watch-progress') ||
    url.pathname.startsWith('/api/health')
  );
}

// Helper: check if request is for image/poster artwork
function isPosterImageRequest(request, url) {
  if (request.destination === 'image') return true;
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'];
  return imageExtensions.some((ext) => url.pathname.toLowerCase().endsWith(ext)) ||
         url.hostname.includes('unsplash.com') ||
         url.hostname.includes('archive.org') ||
         url.hostname.includes('dicebear.com');
}

// Fetch Event
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests for standard caching (mutations handled separately)
  if (request.method !== 'GET') {
    return;
  }

  // Strategy 1: Core Media Metadata API (Network First with Cache Fallback)
  if (isApiMetadataRequest(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(METADATA_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          console.log('[ServiceWorker] Network failed for metadata, returning cached version for:', url.pathname);
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          // Return an offline fallback JSON response if cache miss
          return new Response(JSON.stringify({ offline: true, items: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'X-NovaStream-Offline': 'true' }
          });
        })
    );
    return;
  }

  // Strategy 2: Poster & Thumbnail Images (Cache First, with Network Fallback & Cache updating)
  if (isPosterImageRequest(request, url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached image, but optionally update in background
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(POSTERS_CACHE).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => {/* Ignore background refresh failures */});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const responseClone = networkResponse.clone();
            caches.open(POSTERS_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // If offline and image not cached, return empty or fallback
          return new Response('', { status: 408, statusText: 'Image unavailable offline' });
        });
      })
    );
    return;
  }

  // Strategy 3: HTML / SPA Navigation (Network First with App Shell Fallback)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/index.html') || await caches.match('/');
          if (fallback) return fallback;
          return new Response('Offline - NovaStream App Shell cached version unavailable', {
            status: 503,
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
    return;
  }

  // Strategy 4: Other static JS, CSS, Font assets (Stale-While-Revalidate)
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((res) => {
        if (res && res.status === 200) {
          const resClone = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, resClone));
        }
        return res;
      }).catch(() => cached);

      return cached || networkFetch;
    })
  );
});

// Message Listener for explicit caching triggers from client
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_CORE_METADATA') {
    const { movies, series, watchlist, watchProgress } = event.data;
    caches.open(METADATA_CACHE).then(async (cache) => {
      try {
        if (movies) {
          await cache.put(
            new Request('/api/movies'),
            new Response(JSON.stringify(movies), {
              headers: { 'Content-Type': 'application/json' }
            })
          );
        }
        if (series) {
          await cache.put(
            new Request('/api/series'),
            new Response(JSON.stringify(series), {
              headers: { 'Content-Type': 'application/json' }
            })
          );
        }
        if (watchlist) {
          await cache.put(
            new Request('/api/watchlist'),
            new Response(JSON.stringify(watchlist), {
              headers: { 'Content-Type': 'application/json' }
            })
          );
        }
        if (watchProgress) {
          await cache.put(
            new Request('/api/watch-progress'),
            new Response(JSON.stringify(watchProgress), {
              headers: { 'Content-Type': 'application/json' }
            })
          );
        }
        console.log('[ServiceWorker] Successfully updated core media metadata cache.');
      } catch (err) {
        console.warn('[ServiceWorker] Error explicit caching:', err);
      }
    });
  }
});
