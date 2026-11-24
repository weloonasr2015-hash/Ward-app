/* وليد السباعي — Service Worker: app-shell offline cache */
const CACHE = "ward-shell-v2";
const SHELL = ["./", "./index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

/* App-triggered notifications + click-through */
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SHOW_NOTIFICATION" && data.title) {
    self.registration.showNotification(data.title, {
      body: data.body || "",
      icon: "./icons/icon-192.png",
      badge: "./icons/icon-192.png",
      dir: "rtl",
      lang: "ar",
      tag: data.tag || "ward-" + Date.now(),
      data: { tab: data.tab || "surahs", url: "./" },
      vibrate: [80, 40, 80],
    });
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const tab = (event.notification.data && event.notification.data.tab) || "surahs";
  const target = "./?tab=" + encodeURIComponent(tab);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.focus();
          if ("navigate" in c) return c.navigate(target);
          return undefined;
        }
      }
      return self.clients.openWindow(target);
    })
  );
});

// Cache-first for same-origin GET (app shell); network-first fallback.
// Audio MP3s are stored in IndexedDB by the app itself, so we let them
// pass through to the network untouched.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith(".mp3")) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(( cached) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy).catch(() => {}));
          }
          return res;
        })
        .catch(() => cached);
      return cached || net;
    })
  );
});
