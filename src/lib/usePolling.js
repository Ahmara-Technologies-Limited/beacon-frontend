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
export function usePolling(callback, intervalMs) {
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

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalMs]);
}
