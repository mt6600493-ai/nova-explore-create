/* Nova offline cache — the app opens even with no internet. */
const CACHE = "nova-shell-v3";
const CORE = ["/", "/learn", "/offline", "/planner", "/phone", "/map", "/manifest.webmanifest", "/favicon.png", "/icon-192.png", "/creator.jpg"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(CORE.map((u) => c.add(u)))).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET") return;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/~oauth")) return;

  const isAsset = url.origin === self.location.origin && /\.(js|css|png|jpg|jpeg|svg|webp|woff2?)$/.test(url.pathname);

  // Static files: cache-first (fast open). Pages: network-first with offline fallback.
  if (isAsset) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) return cached;
        if (req.mode === "navigate") return (await caches.match("/offline")) || (await caches.match("/")) || Response.error();
        return Response.error();
      }),
  );
});
