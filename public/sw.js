/*
 * The service worker.
 *
 * Deliberately small and deliberately not a cache. Its only job is to be awake
 * when the site is closed, which is the entire reason Web Push exists — and the
 * entire reason a tutor can find out a lead arrived without having the tab
 * open. Offline caching is a separate decision with its own failure modes, and
 * a worker that quietly serves a stale page is worse than no worker.
 *
 * Plain JavaScript, served from `public/` rather than compiled: a service
 * worker must live at the scope it controls, and `/sw.js` controls everything.
 */

// Take over immediately rather than waiting for every tab to close. There is
// no cached state for an old worker to be protecting.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    // Not ours, or malformed. Showing "New notification" for something we
    // cannot read is worse than showing nothing.
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      // The recipient's own language, not the sender's and not the device's.
      // Two of three locales here are RTL and the OS will not guess.
      dir: payload.dir || "auto",
      lang: payload.lang,
      icon: "/icon-192.png",
      // Monochrome; Android masks this into the status bar.
      badge: "/icon-badge-96.png",
      // Replaces an unread notification about the same thing instead of
      // stacking a second one. The server sends the same tag it coalesces on.
      tag: payload.tag,
      data: { href: payload.href },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const href = (event.notification.data && event.notification.data.href) || "/";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Already looking at it: just bring that tab forward.
      for (const client of windows) {
        if (new URL(client.url).pathname === href) return client.focus();
      }

      // Otherwise reuse an open tab rather than piling up new ones — this
      // audience is largely on phones, where every extra tab is a cost.
      const existing = windows[0];
      if (existing && "navigate" in existing) {
        await existing.focus();
        return existing.navigate(href);
      }

      return self.clients.openWindow(href);
    })(),
  );
});
