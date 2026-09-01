import { useEffect, useRef } from 'react';

export function useWakeLock() {
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!('wakeLock' in navigator)) return;

    let cancelled = false;

    async function acquire() {
      if (sentinelRef.current) return;
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        if (cancelled) {
          sentinel.release();
          return;
        }
        sentinelRef.current = sentinel;
        // The browser releases the lock on its own whenever the tab is
        // hidden — without this, sentinelRef would keep pointing at a dead
        // sentinel and every re-acquire attempt below would silently no-op.
        sentinel.addEventListener('release', () => {
          sentinelRef.current = null;
        });
      } catch {
        // Wake lock requests can fail (e.g. low battery, tab not visible
        // yet) — not fatal, the game still works without it.
      }
    }

    function maybeReacquire() {
      if (document.visibilityState === 'visible') acquire();
    }

    acquire();
    document.addEventListener('visibilitychange', maybeReacquire);
    window.addEventListener('focus', maybeReacquire);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', maybeReacquire);
      window.removeEventListener('focus', maybeReacquire);
      sentinelRef.current?.release();
      sentinelRef.current = null;
    };
  }, []);
}
