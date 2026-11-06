// Necessário para o app poder ser instalado. Não guarda nada em cache:
// sempre busca a versão mais nova no servidor.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
