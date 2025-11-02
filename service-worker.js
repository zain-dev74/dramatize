const CACHE_NAME = 'dramatize-v1.0.2';
const STATIC_CACHE = 'dramatize-static-v6';
const DYNAMIC_CACHE = 'dramatize-dynamic-v6';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdn.plyr.io/3.7.8/plyr.css',
  'https://cdn.plyr.io/3.7.8/plyr.polyfilled.js',
  'https://cdn.jsdelivr.net/npm/hls.js@latest'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle same-origin requests
  if (url.origin === location.origin) {
    // Skip cache for HTML, CSS, JS files and API endpoints to ensure fresh content
    const skipCache = url.pathname.endsWith('.html') || 
                     url.pathname.endsWith('.css') || 
                     url.pathname.endsWith('.js') || 
                     url.pathname.includes('/api/') ||
                     url.pathname === '/' ||
                     url.pathname === '/index.html';
    
    if (skipCache) {
      // Always fetch from network for critical files
      event.respondWith(
        fetch(request)
          .then((networkResponse) => {
            return networkResponse;
          })
          .catch(() => {
            // Return offline fallback for HTML pages only
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }
            throw new Error('Network unavailable');
          })
      );
    } else {
      // Use cache-first strategy for other assets (images, fonts, etc.)
      event.respondWith(
        caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            return fetch(request)
              .then((networkResponse) => {
                // Cache successful responses for non-critical assets
                if (networkResponse.status === 200) {
                  const responseClone = networkResponse.clone();
                  caches.open(DYNAMIC_CACHE)
                    .then((cache) => {
                      cache.put(request, responseClone);
                    });
                }
                return networkResponse;
              })
              .catch(() => {
                // Return a generic offline response
                return new Response('Offline content not available', {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: new Headers({
                    'Content-Type': 'text/plain'
                  })
                });
              });
          })
      );
    }
  }
  
  // Handle external requests (fonts, CDN resources)
  else if (STATIC_ASSETS.includes(request.url)) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          return cachedResponse || fetch(request)
            .then((networkResponse) => {
              const responseClone = networkResponse.clone();
              caches.open(STATIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
              return networkResponse;
            })
            .catch(() => {
              return new Response('Resource not available offline', {
                status: 503,
                statusText: 'Service Unavailable'
              });
            });
        })
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    // Handle background sync tasks here
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/logo.png',
      badge: '/logo.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      },
      actions: [
        {
          action: 'explore',
          title: 'Watch Now',
          icon: '/logo.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/logo.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});