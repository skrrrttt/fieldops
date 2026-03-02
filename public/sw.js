/// <reference lib="webworker" />

const CACHE_NAME = 'prostreet-v1';
const STATIC_ASSETS = [
  '/',
  '/login',
  '/tasks',
  '/manifest.json',
];

// Background Sync tag for mutations
const SYNC_TAG = 'sync-mutations';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first with cache fallback for navigation
// Cache first for static assets (no background revalidation)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip API and auth requests - always go to network
  if (url.pathname.startsWith('/api') || url.pathname.includes('supabase')) {
    return;
  }

  // For navigation requests (HTML pages) - network first, fall back to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return caches.match('/');
          });
        })
    );
    return;
  }

  // For static assets - cache first only (no background revalidation)
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        });
      })
    );
    return;
  }

  // Default: network with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Background Sync event - process queued mutations when online
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(processPendingMutations());
  }
});

// Process pending mutations - notify clients to handle in the app
async function processPendingMutations() {
  try {
    const clients = await self.clients.matchAll({ type: 'window' });

    if (clients.length > 0) {
      clients[0].postMessage({
        type: 'SYNC_MUTATIONS',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    throw error; // Rethrow to retry sync
  }
}

// Message event - handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Periodic Background Sync (if available)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-check') {
    event.waitUntil(processPendingMutations());
  }
});
