// Simple offline-first service worker.
importScripts("./version.js"); // sets self.APP_VERSION
const CACHE_NAME = "momentum-v" + (self.APP_VERSION || "0");
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./version.js",
  "./qrcode.js",
  "./jsQR.js",
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

// ---- Web Push: show notification even when the app is closed ----
self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch (e) {
    try { payload = { body: event.data ? event.data.text() : "" }; } catch (_) {}
  }
  const title = payload.title || "⏰ Momentum reminder";
  const options = {
    body: payload.body || "You have habits due. Open Momentum to check them off.",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    tag: payload.tag || "ht-push",
    renotify: true,
    data: { ids: payload.ids || [] },
  };
  if (payload.ids && payload.ids.length) {
    options.actions = [
      { action: "done", title: "✓ Done" },
      { action: "snooze", title: "Snooze" },
    ];
  }
  event.waitUntil(self.registration.showNotification(title, options));
});

// If the subscription is rotated by the browser, tell any open client to
// re-register so the server gets the fresh endpoint.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    clients.forEach((c) => c.postMessage({ type: "push-resubscribe" }));
  })());
});

// ---- Web Push: show a notification pushed by the Momentum push Worker ----
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { title: "Momentum", body: event.data ? event.data.text() : "" }; }
  const title = data.title || "Momentum";
  const options = {
    body: data.body || "",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    tag: data.tag || "ht-push",
    renotify: true,
    data: { ids: data.ids || [] },
  };
  if (data.ids && data.ids.length) {
    options.actions = [
      { action: "done", title: "✓ Done" },
      { action: "snooze", title: "Snooze" },
    ];
  }
  event.waitUntil(self.registration.showNotification(title, options));
});

// The app re-registers its subscription on next open, so just log here.
self.addEventListener("pushsubscriptionchange", () => {});

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
