// Simple offline-first service worker.
const CACHE_NAME = "momentum-v25";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./qrcode.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first with cache fallback: get fresh content when online,
// serve cached copy when offline.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req))
  );
});

// ---- Notification click handling (action buttons: Done / Snooze) ----
self.addEventListener("notificationclick", (event) => {
  const action = event.action || "open";
  const data = event.notification.data || {};
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const msg = { type: "notif-action", action, data };
    if (all.length > 0) {
      try { await all[0].focus(); } catch (e) {}
      all[0].postMessage(msg);
    } else {
      // App is closed — open it with the action encoded in the query string.
      const qs = new URLSearchParams();
      qs.set("notif", action);
      if (data.ids && data.ids.length) qs.set("ids", data.ids.join(","));
      await self.clients.openWindow("./?" + qs.toString());
    }
  })());
});
