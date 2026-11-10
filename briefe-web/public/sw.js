// Service Worker der Briefe-App: Offline-Betrieb (App-Dateien) und Push-Erinnerungen.
// Briefdaten liegen nicht hier, sondern im Gerätespeicher der App. Server- und KI-Aufrufe werden nie zwischengespeichert.
const CACHE = "briefe-app-v2";
// Alle Pfade relativ zum Ordner der App, damit sie auch in einem Unterordner läuft (z. B. GitHub Pages)
const ROOT = new URL("./", self.location).href;
const ICON = new URL("icons/icon-192.png", self.location).href;
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([ROOT, ROOT + "index.html", ROOT + "manifest.webmanifest"])).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener("fetch", (e) => {
  const r = e.request; const u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== self.location.origin) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(r);
      if (res.ok && res.type === "basic") { const c = await caches.open(CACHE); c.put(r.mode === "navigate" ? ROOT : r, res.clone()); }
      return res;
    } catch (err) {
      const hit = (r.mode === "navigate" ? (await caches.match(ROOT)) || (await caches.match(ROOT + "index.html")) : await caches.match(r));
      if (hit) return hit;
      throw err;
    }
  })());
});
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) {}
  event.waitUntil(self.registration.showNotification(d.title || "Frist", { body: d.body || "", tag: d.key || "frist", requireInteraction: true, icon: ICON, badge: ICON }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: "window" }).then((cl) => (cl.length ? cl[0].focus() : self.clients.openWindow(ROOT))));
});
