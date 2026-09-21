/* Beacon CRM service worker.
 *
 * Deliberately conservative about what it keeps, because this is a CRM:
 *
 *   - API responses are NEVER cached. They are client records behind a login,
 *     often on a shared or personal phone, and a cached copy would both
 *     outlive the session and go stale - a closer acting on yesterday's
 *     pipeline is worse than a closer seeing a spinner.
 *   - Page HTML is not cached either. Every page is client-rendered against
 *     the API, so a cached shell would only ever show a loading state; when
 *     the network is gone, the offline page explains that instead.
 *   - Build assets under /_next/static/ ARE cached, permanently. Their URLs
 *     contain a content hash, so a given URL's bytes never change, and they
 *     are what makes a warm start feel instant.
 *
 * The result is an installable app that starts fast and fails honestly,
 * rather than one that pretends to work offline with data it should not be
 * holding. Offline *use* would need a sync layer and a deliberate decision
 * about storing client data on the device.
 */

const VERSION = 'v1';
const STATIC_CACHE = `beacon-static-${VERSION}`;
const SHELL_CACHE = `beacon-shell-${VERSION}`;
const OFFLINE_URL = '/offline.html';

const SHELL_ASSETS = [
  OFFLINE_URL,
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      // Take over promptly: a half-updated app (new HTML, old worker) is
      // harder to reason about than a brief reload.
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith('beacon-') && !name.endsWith(VERSION))
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Signing out clears anything this worker holds. Nothing cached is
// user-specific today, but that must stay true by construction rather than by
// memory, so the hook exists and the page calls it.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((names) =>
        Promise.all(names.filter((n) => n.startsWith('beacon-')).map((n) => caches.delete(n)))
      )
    );
  }
});

const isStaticAsset = (url) =>
  url.pathname.startsWith('/_next/static/') ||
  url.pathname.startsWith('/icons/') ||
  url.pathname === '/favicon.svg';

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only GET is ever safe to serve from a cache; a queued POST would be a
  // silent duplicate booking once connectivity returned.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Anything not on this origin - the API included - goes straight to the
  // network, untouched and unstored.
  if (url.origin !== self.location.origin) return;

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
    return;
  }

  // Navigations: always the network, with the offline page as the fallback so
  // a dead connection reads as a clear message rather than the browser's
  // dinosaur.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
  }
});

/* --- Web push -------------------------------------------------------
 *
 * The caching half of this worker is about speed; this half is why the app
 * is worth installing. A push arrives when the app is closed, which is
 * exactly when a missed follow-up or a lead going dormant is worth knowing
 * about.
 *
 * The payload is the notification the server already created, so the bell
 * and the device agree on what happened.
 */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Beacon CRM', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Beacon CRM', {
      body: payload.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      // Tagging by notification id means a re-delivered push replaces its
      // predecessor rather than stacking a second copy of the same alert.
      tag: payload.id || undefined,
      data: { url: payload.url || '/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/dashboard';

  // Focus an open window and navigate it rather than opening a second copy
  // of the CRM next to the one already running.
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) => {
        for (const client of windows) {
          if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
            return client.focus().then((focused) => focused.navigate(target));
          }
        }
        return self.clients.openWindow(target);
      })
  );
});
