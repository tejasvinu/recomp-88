const CACHE_VERSION = "recomp88-v2";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const NEXT_ASSET_CACHE = `${CACHE_VERSION}-next-assets`;
const STATIC_ASSET_CACHE = `${CACHE_VERSION}-static`;
const APP_SHELL_URLS = ["/", "/manifest.json"];
const MAX_PAGE_CACHE_ENTRIES = 10;
const MAX_NEXT_ASSET_ENTRIES = 80;
const MAX_STATIC_ASSET_ENTRIES = 50;

const trimCache = async (cacheName, maxEntries) => {
  if (!Number.isFinite(maxEntries)) return;

  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const overflowCount = keys.length - maxEntries;

  if (overflowCount <= 0) return;

  await Promise.all(keys.slice(0, overflowCount).map((request) => cache.delete(request)));
};

const cacheResponse = async (cacheName, request, response) => {
  if (!response || response.status !== 200 || response.type === "opaque") {
    return response;
  }

  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());

  if (cacheName === PAGE_CACHE) {
    await trimCache(PAGE_CACHE, MAX_PAGE_CACHE_ENTRIES);
  } else if (cacheName === NEXT_ASSET_CACHE) {
    await trimCache(NEXT_ASSET_CACHE, MAX_NEXT_ASSET_ENTRIES);
  } else if (cacheName === STATIC_ASSET_CACHE) {
    await trimCache(STATIC_ASSET_CACHE, MAX_STATIC_ASSET_ENTRIES);
  }

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
          .filter((key) =>
            ![APP_SHELL_CACHE, PAGE_CACHE, NEXT_ASSET_CACHE, STATIC_ASSET_CACHE].includes(key)
          )
          .map((key) => caches.delete(key))
      );

      await Promise.all([
        trimCache(PAGE_CACHE, MAX_PAGE_CACHE_ENTRIES),
        trimCache(NEXT_ASSET_CACHE, MAX_NEXT_ASSET_ENTRIES),
        trimCache(STATIC_ASSET_CACHE, MAX_STATIC_ASSET_ENTRIES),
      ]);

      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNextAsset = isSameOrigin && url.pathname.startsWith("/_next/");
  const isStaticAsset =
    isSameOrigin &&
    (url.pathname === "/manifest.json" ||
      /\.(?:js|css|png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/i.test(url.pathname));

  if (isSameOrigin && url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          return cacheResponse(PAGE_CACHE, request, response);
        } catch {
          const pageCache = await caches.open(PAGE_CACHE);
          return (
            (await pageCache.match(request)) ||
            (await caches.match("/")) ||
            new Response("Offline", { status: 503, statusText: "Offline" })
          );
        }
      })()
    );
    return;
  }

  if (isNextAsset || isStaticAsset) {
    const cacheName = isNextAsset ? NEXT_ASSET_CACHE : STATIC_ASSET_CACHE;
    event.respondWith(
      (async () => {
        const cache = await caches.open(cacheName);
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const response = await fetch(request);
          return cacheResponse(cacheName, request, response);
        } catch {
          return cache.match(request);
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      try {
        return await fetch(request);
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw new Error("Network request failed");
      }
    })()
  );
});
