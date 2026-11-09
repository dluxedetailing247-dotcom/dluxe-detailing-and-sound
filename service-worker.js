const CACHE_NAME = "dluxe-pwa-v10";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];


/* INSTALL */

self.addEventListener(
  "install",

  event => {

    event.waitUntil(

      caches
        .open(CACHE_NAME)

        .then(cache => {

          return cache.addAll(
            APP_FILES
          );

        })

        .then(() => {

          return self.skipWaiting();

        })

    );

  }

);


/* ACTIVATE */

self.addEventListener(
  "activate",

  event => {

    event.waitUntil(

      caches
        .keys()

        .then(keys => {

          return Promise.all(

            keys
              .filter(
                key =>
                  key !== CACHE_NAME
              )

              .map(
                key =>
                  caches.delete(key)
              )

          );

        })

        .then(() => {

          return self.clients.claim();

        })

    );

  }

);


/* FETCH */

self.addEventListener(
  "fetch",

  event => {

    if (
      event.request.method !==
      "GET"
    ) return;


    event.respondWith(

      fetch(
        event.request
      )

      .then(response => {

        const copy =
          response.clone();

        caches
          .open(CACHE_NAME)

          .then(cache => {

            cache.put(
              event.request,
              copy
            );

          });

        return response;

      })

      .catch(() => {

        return caches.match(
          event.request
        );

      })

    );

  }

);
