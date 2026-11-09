// Guarda no aparelho os arquivos do app (código, fontes e ícones) pra abrir rápido.
// Fotos e dados nunca passam por aqui: vêm sempre do servidor.
const CACHE = 'streak-app-v1'
const MAX_FILES = 90

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  ),
)

// Versões antigas vão ficando pra trás: apaga as mais velhas quando passa do limite.
async function trim(cache) {
  const keys = await cache.keys()
  for (let i = 0; i < keys.length - MAX_FILES; i++) await cache.delete(keys[i])
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Arquivos com nome único por versão: do aparelho, se já tiver.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok) {
          await cache.put(req, res.clone())
          trim(cache)
        }
        return res
      }),
    )
    return
  }

  // A página: sempre a mais nova; sem internet, a última que abriu.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put('/', copy))
          }
          return res
        })
        .catch(() => caches.match('/').then((hit) => hit || Response.error())),
    )
  }
})

// Notificação chegando com o app fechado.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Streak', body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Streak', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || undefined,
      renotify: !!data.tag,
      data: { url: data.url || '/' },
    }),
  )
})

// Tocar na notificação abre o app (ou traz pra frente se já estiver aberto).
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})
