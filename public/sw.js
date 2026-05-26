const CACHE = 'c4clinic-v1'
const OFFLINE_URL = '/'

const PRECACHE = [
  '/',
  '/index.html',
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.open(CACHE).then(c => c.match(OFFLINE_URL))
      )
    )
    return
  }
  // Cache-first for static assets
  if (e.request.destination === 'script' || e.request.destination === 'style' || e.request.destination === 'image') {
    e.respondWith(
      caches.match(e.request).then(cached =>
        cached || fetch(e.request).then(res => {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
          return res
        })
      )
    )
    return
  }
  // Network-first for API calls
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)))
})

self.addEventListener('push', e => {
  const data = e.data?.json() || { title: 'C4CLINIC', body: 'Nova notificação' }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' }
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(clients.openWindow(e.notification.data.url || '/'))
})
