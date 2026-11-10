
/*
 D-LUXE DETAILING & SOUND
 ADMIN PWA SERVICE WORKER V15

 Only caches approved admin static files.
 Does NOT cache:
 - Client portal pages
 - Supabase API responses
 - Customer information
 - Quotes or job records
 - Photo uploads
*/

const CACHE_NAME = "dluxe-pwa-v15";

const BASE = new URL(
  self.registration.scope
);

const INDEX = new URL(
  "index.html",
  BASE
);

const MANIFEST = new URL(
  "manifest.json",
  BASE
);

const STATIC_PATHS = new Set([
  BASE.pathname,
  INDEX.pathname,
  MANIFEST.pathname,
  new URL(
    "icons/icon-192-1.png",
    BASE
  ).pathname,
  new URL(
    "icons/icon-512-1.png",
    BASE
  ).pathname
]);

const PRECACHE = [
  INDEX.href,
  MANIFEST.href
];

// Install the updated cache.
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Remove only outdated D-LUXE PWA caches.
self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();

      await Promise.all(
        names
          .filter(name =>
            name.startsWith("dluxe-pwa-") &&
            name !== CACHE_NAME
          )
          .map(name => caches.delete(name))
      );

      await self.clients.claim();
    })()
  );
});

// Intercept ONLY approved static files.
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (!STATIC_PATHS.has(url.pathname)) {
    return;
  }

  if (request.headers.has("authorization")) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Prefer fresh files from GitHub Pages.
        const response = await fetch(request);

        if (
          response.ok &&
          response.type === "basic"
        ) {
          const cache = await caches.open(
            CACHE_NAME
          );

          await cache.put(
            request,
            response.clone()
          );
        }

        return response;

      } catch (error) {
        // Offline fallback for approved files only.
        const cache = await caches.open(
          CACHE_NAME
        );

        const cached = await cache.match(
          request,
          { ignoreSearch: true }
        );

        if (cached) {
          return cached;
        }

        if (request.mode === "navigate") {
          return (
            await cache.match(INDEX.href)
          ) || Response.error();
        }

        return Response.error();
      }
    })()
  );
});
