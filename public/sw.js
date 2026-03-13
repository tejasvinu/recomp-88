self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys.filter((key) => !key.includes("workbox")).map((key) => caches.delete(key))
      );

      await self.clients.claim();
      await self.registration.unregister();

      const clients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      });

      clients.forEach((client) => {
        client.navigate(client.url);
      });
    })()
  );
});
