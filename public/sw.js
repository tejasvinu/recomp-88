const CACHE_VERSION = "recomp88-v1";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const APP_SHELL_URLS = ["/", "/manifest.json"];

const cacheResponse = async (request, response) => {
  if (!response || response.status !== 200 || response.type === "opaque") {
    return response;
  }

  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(request, response.clone());
  return response;
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      await cache.addAll(APP_SHELL_URLS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys
          .filter((key) => ![APP_SHELL_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isStaticAsset =
    isSameOrigin &&
    (url.pathname.startsWith("/_next/") ||
      url.pathname === "/manifest.json" ||
      /\.(?:js|css|png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/i.test(url.pathname));

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          return cacheResponse(request, response);
        } catch {
          return (
            (await caches.match(request)) ||
            (await caches.match("/")) ||
            new Response("Offline", { status: 503, statusText: "Offline" })
          );
        }
      })()
    );
    return;
  }

  if (isStaticAsset) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        try {
          const response = await fetch(request);
          return cacheResponse(request, response);
        } catch {
          return caches.match(request);
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        return cacheResponse(request, response);
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw new Error("Network request failed");
      }
    })()
  );
});
