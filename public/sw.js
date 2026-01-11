/// <reference lib="webworker" />

const CACHE_NAME = 'fieldops-v1';
const STATIC_ASSETS = [
  '/',
  '/login',
  '/tasks',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Background Sync tag for mutations
const SYNC_TAG = 'sync-mutations';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - network first with cache fallback for navigation
// Cache first for static assets
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
          // Clone the response to cache it
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return cached homepage as fallback
            return caches.match('/');
          });
        })
    );
    return;
  }

  // For static assets - cache first, then network
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version and update cache in background
          fetch(request).then((response) => {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, response);
            });
          });
          return cachedResponse;
        }
        // Not in cache, fetch and cache
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
  console.log('[SW] Sync event received:', event.tag);

  if (event.tag === SYNC_TAG) {
    event.waitUntil(processPendingMutations());
  }
});

// Process pending mutations - notify clients to handle in the app
async function processPendingMutations() {
  console.log('[SW] Processing pending mutations via background sync');

  try {
    // Get all clients (open tabs/windows)
    const clients = await self.clients.matchAll({ type: 'window' });

    if (clients.length > 0) {
      // Notify the first client to process mutations
      // The client-side code has access to IndexedDB and Supabase client
      clients[0].postMessage({
        type: 'SYNC_MUTATIONS',
        timestamp: new Date().toISOString(),
      });
      console.log('[SW] Notified client to sync mutations');
    } else {
      console.log('[SW] No clients available to process mutations');
    }
  } catch (error) {
    console.error('[SW] Error in background sync:', error);
    throw error; // Rethrow to retry sync
  }
}

// Message event - handle messages from clients
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Periodic Background Sync (if available)
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync event:', event.tag);

  if (event.tag === 'sync-check') {
    event.waitUntil(processPendingMutations());
  }
});
