const CACHE = "movetra-static-v4";
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icon-192.png?v=3",
  "/icon-512.png?v=3",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isAppPage = event.request.mode === "navigate";
  const isNextAsset = url.pathname.startsWith("/_next/");
  const isApiRequest = url.origin === self.location.origin && url.pathname.startsWith("/api/");

  // HTML, bundle Next.js, dan respons API selalu berasal dari jaringan.
  // Respons API dapat berisi token sekali pakai sehingga tidak boleh masuk cache.
  if (isAppPage || isNextAsset || isApiRequest) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(event.request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
