// Busca primeiro na rede (o site se atualiza sozinho) e usa a cópia local quando não há internet.
// Guarda somente arquivos do site. Chamadas ao banco nunca passam pelo cache.
const CACHE = "academy-site-v4";
const ARQ = ["./","index.html","base.css","academy.css","app.js","config.js","demo.js","demo-dados.js","manifest.json","versao.json",
  "assets/marca/mais-verde.png","assets/marca/vertical-branco.png","assets/logos/horizontal-branco.png","assets/logos/vertical.png","assets/icone-192.png","assets/apple-touch-icon.png",
  "assets/fonts/inter-latin-400-normal.woff2","assets/fonts/inter-latin-500-normal.woff2","assets/fonts/inter-latin-600-normal.woff2",
  "assets/fonts/space-grotesk-latin-600-normal.woff2","assets/fonts/space-grotesk-latin-700-normal.woff2"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(ARQ.map(a => c.add(a)))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then(r => {
    if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("index.html"))));
});
