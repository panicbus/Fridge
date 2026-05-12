/**
 * Request a screen wake lock. Returns a cleanup that releases the lock and
 * removes visibility listeners. Best-effort: no-ops when unsupported.
 */
export async function requestWakeLock(): Promise<() => void> {
  const wl = navigator.wakeLock;
  if (!wl?.request) {
    console.warn('[wakeLock] Screen Wake Lock API not available');
    return () => {};
  }

  let lock: WakeLockSentinel | null = null;
  let cancelled = false;

  const releaseLock = async () => {
    try {
      await lock?.release();
    } catch {
      /* already released */
    }
    lock = null;
  };

  const acquire = async () => {
    if (cancelled || document.visibilityState !== 'visible') return;
    try {
      await releaseLock();
      lock = await wl.request('screen');
    } catch (e) {
      console.warn('[wakeLock] request failed', e);
    }
  };

  const onVisibility = () => {
    void acquire();
  };

  document.addEventListener('visibilitychange', onVisibility);
  await acquire();

  return () => {
    cancelled = true;
    document.removeEventListener('visibilitychange', onVisibility);
    void releaseLock();
  };
}
