workbox.core.skipWaiting();
workbox.core.clientsClaim();

workbox.setConfig({
  debug: true
});

const cachedPathNames = [
  "/v2/transaction/details",
  "/v2/rawtransactions/getRawTransaction",
  "/v2/slp/validateTxid"
];

workbox.routing.registerRoute(
  ({ url, event }) => cachedPathNames.some(cachedPathName => url.pathname.includes(cachedPathName)),
  async ({ event, url }) => {
    try {
      const cache = await caches.open("api-cache");
      const requestBody = await event.request.clone().text();

      try {
        const response = await cache.match(`${url.pathname}/${requestBody}`);
        if (!response) {
          throw new Error("SW: Not cached!");
        }
        return response;
      } catch (error) {
        const response = await fetch(event.request.clone());
        const body = await response.clone().text();
        cache.put(`${url.pathname}/${requestBody}`, new Response(body, { status: 200 }));
        return response.clone();
      }
    } catch (err) {
      return fetch(event.request.clone());
    }
  },
  "POST"
);
