// Caches same-origin assets and fonts for offline use, while removing stale app caches.
const CACHE_NAME = 'peershare-cache-v1'

// Activate this worker immediately so new clients use the current cache policy.
self.addEventListener('install', () => {
  self.skipWaiting()
})

// Remove older cache versions and take control of existing tabs.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Cache successful GET responses and serve cached resources when the network is unavailable.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  const isLocal = url.origin === self.location.origin
  const isFont = url.hostname.includes('fonts.googleapis') || url.hostname.includes('fonts.gstatic')

  if (isLocal || isFont) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            if (event.request.mode === 'navigate') {
              return caches.match('/')
            }
          })
        })
    )
  }
})
