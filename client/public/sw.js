const CACHE_NAME = 'peershare-cache-v1'

// Install: Precache the application entry page.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.add('/')
    })
  )

  self.skipWaiting()
})


// Activate: Remove outdated PeerShare caches.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(
            (name) =>
              name.startsWith('peershare-cache-') &&
              name !== CACHE_NAME
          )
          .map((name) => caches.delete(name))
      )
    }).then(() => self.clients.claim())
  )
})


// Fetch: Handle requests using appropriate caching strategies.
self.addEventListener('fetch', (event) => {
  const request = event.request

  // Ignore non-GET requests.
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  const isLocal = url.origin === self.location.origin

  const isFont =
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')

  // Ignore external requests except Google Fonts.
  if (!isLocal && !isFont) return

  // 1. Navigation requests: Network First.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)

          if (response.ok) {
            const cache = await caches.open(CACHE_NAME)
            await cache.put(request, response.clone())
          }

          return response
        } catch  {
          const cache = await caches.open(CACHE_NAME)

          return (
            await cache.match(request) ||
            await cache.match('/')
          )
        }
      })()
    )

    return
  }

  // 2. Static assets and fonts: Cache First.
  const isStaticAsset =
    ['script', 'style', 'image', 'font'].includes(request.destination) ||
    isFont

  if (isStaticAsset) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME)

        const cachedResponse = await cache.match(request)

        if (cachedResponse) {
          return cachedResponse
        }

        try {
          const response = await fetch(request)

          if (response.ok) {
            await cache.put(request, response.clone())
          }

          return response
        } catch  {
          return new Response('Resource unavailable offline', {
            status: 503,
            statusText: 'Service Unavailable',
          })
        }
      })()
    )
  }
})