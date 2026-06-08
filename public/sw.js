/* Service Worker — Agente Windmar Home AI (PWA)
 * Objetivo: cumplir el requisito de instalabilidad en Windows/Edge/Chrome
 * (manifest + SW con handler de fetch) y dar un fallback offline básico,
 * SIN interferir con autenticación (next-auth) ni con las llamadas a la API.
 */
const CACHE = 'windmar-ai-v2';

// Recursos que precacheamos para el "shell" y el modo offline.
const PRECACHE = [
  '/',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/sunbot-feliz.png',
  '/sunbot-error.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo GET y mismo origen. Nunca interceptamos API ni rutas de auth.
  const isSameOrigin = url.origin === self.location.origin;
  const isApiOrAuth = url.pathname.startsWith('/api') || url.pathname.startsWith('/auth');
  if (request.method !== 'GET' || !isSameOrigin || isApiOrAuth) {
    return; // dejar pasar a la red sin tocar
  }

  // Navegaciones (HTML): network-first con fallback a caché → '/'.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Estáticos (imágenes, _next, fuentes): cache-first con relleno en segundo plano.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
