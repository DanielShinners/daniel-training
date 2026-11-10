/* Training service worker: app shell cached. Supabase REST, auth and functions are network-only and never cached. */
const CACHE = "dt-v38";
const SHELL = ["./", "index.html", "config.js", "manifest.webmanifest", "icon.svg", "icon-maskable.svg", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png", "favicon.svg", "favicon-32.png", "favicon-16.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (u.hostname.endsWith(".supabase.co") || u.hostname.endsWith(".supabase.in")) {
    e.respondWith(fetch(e.request, { cache: "no-store" }));
    return;
  }
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  if (u.pathname.endsWith("/strava-setup.html")) return;
  // network first so updates land straight away, cache as offline fallback
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(m => m || caches.match("index.html"))));
});
