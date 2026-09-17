import { useEffect, useRef } from 'react';

// Every list-owning view polls its data on a timer (on top of the
// event-driven refresh from dataEvents.js, which handles the common case of
// "something changed, refetch now"). The timer is just a safety net for
// changes made by other users/sessions. Previously every view rolled its own
// setInterval that kept firing at full speed even when the tab was in the
// background/minimized - multiplied across however many views a user had
// open in background tabs, that's a steady stream of pointless requests.
//
// usePolling runs `callback` immediately, then on the given interval, but
// pauses entirely while the tab is hidden (document.visibilitychange) and
// immediately re-fires once it becomes visible again so data isn't stale
// when the user comes back.
//
// `resetKey` is for views whose data depends on something the user can change
// (the archived/active toggle, the lead being viewed): pass that value and the
// callback re-fires immediately whenever it changes, restarting the interval
// from that point. Views used to do this by calling their own load function
// from an effect alongside usePolling, which meant two fetches on mount and
// put a data fetch inside an effect body; owning it here leaves each view
// with exactly one place that loads its data.
export function usePolling(callback, intervalMs, resetKey = null) {
  const callbackRef = useRef(callback);

  // Keep the ref current without writing to it during render (React's rules
  // of hooks disallow mutating a ref outside an effect/event handler) - this
  // effect re-runs on every render since it has no dependency array, so the
  // ref is always in sync before the interval below can fire.
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    let intervalId = null;

    const start = () => {
      if (intervalId) return;
      intervalId = setInterval(() => callbackRef.current(), intervalMs);
    };
    const stop = () => {
      if (!intervalId) return;
      clearInterval(intervalId);
      intervalId = null;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        callbackRef.current();
        start();
      }
    };

    // Fire once up front, not just on the first interval tick. Without this
    // a view's first fetch only happens `intervalMs` after mount - invisible
    // in demo mode (1.5-2s) but a 30 second blank screen in live mode, where
    // getPollInterval clamps every interval to >= 30s.
    if (!document.hidden) {
      callbackRef.current();
      start();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalMs, resetKey]);
}
