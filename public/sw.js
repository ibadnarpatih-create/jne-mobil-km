const CACHE = "movetra-static-v3";
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

  // HTML dan bundle Next.js selalu berasal dari deployment yang sama.
  if (isAppPage || isNextAsset) {
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
