'use client';

import { useEffect, useState } from 'react';

// Registers the service worker, and tells the user when a new version of the
// app is ready rather than leaving them on a stale one until they happen to
// close every tab.
//
// Registration is skipped in development: a worker that outlives a dev server
// restart serves assets from a build that no longer exists, which looks like
// the app is broken when only the cache is.

export default function ServiceWorkerRegistrar() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      // Not just "don't register": a worker registered by a production build
      // on this same origin outlives it, and its cache-first rule for
      // /_next/static/ then serves those stale chunks to the dev server -
      // edits stop appearing and the app looks haunted. Tear it down.
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      caches?.keys().then((names) => {
        names.filter((n) => n.startsWith('beacon-')).forEach((n) => caches.delete(n));
      });
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;

    const onUpdateFound = () => {
      const installing = registration?.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        // A worker that reaches "installed" while another one controls the
        // page is a newer build waiting its turn.
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          setUpdateReady(true);
        }
      });
    };

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        registration = reg;
        reg.addEventListener('updatefound', onUpdateFound);
      })
      .catch((err) => {
        // Never fatal: the app works without a worker, it just starts colder.
        console.warn('[pwa] service worker registration failed', err);
      });

    return () => registration?.removeEventListener('updatefound', onUpdateFound);
  }, []);

  if (!updateReady) return null;

  return (
    <div className="pwa-update-bar" role="status">
      <span>A new version of Beacon CRM is ready.</span>
      <button type="button" onClick={() => window.location.reload()}>
        Reload
      </button>
      <style>{`
        .pwa-update-bar {
          position: fixed;
          left: 50%;
          bottom: 20px;
          transform: translateX(-50%);
          z-index: 3000;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 14px 10px 18px;
          border-radius: 999px;
          background: #101828;
          color: #fff;
          font-size: 13px;
          box-shadow: 0 8px 24px rgba(16, 24, 40, 0.24);
          max-width: calc(100vw - 32px);
        }
        .pwa-update-bar button {
          font: inherit;
          font-weight: 600;
          color: #101828;
          background: #fff;
          border: none;
          border-radius: 999px;
          padding: 6px 14px;
          cursor: pointer;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
