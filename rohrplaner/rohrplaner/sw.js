/* Rohrplaner – Service Worker
   Netzwerk zuerst: online kommt immer die neueste Version (Updates ohne Cache-Löschen),
   offline wird die zuletzt geladene Version aus dem Cache verwendet. */
const CACHE = 'rohrplaner-v7';
const FILES = ['./', 'index.html', 'styles.css', 'parts.js', 'i18n.js', 'info.js', 'legal.js', 'examples.js', 'ai-stub.js', 'app.js',
  'manifest.webmanifest', 'icons/icon.svg'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
