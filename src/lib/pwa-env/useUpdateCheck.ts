'use client';

/**
 * Detects a newer deployed build without a service worker: polls a JSON endpoint (see
 * `buildInfoRoute`) whenever the tab becomes relevant again — mount, resume from background,
 * regains focus, comes back online — throttled so repeated triggers in quick succession (e.g.
 * focus + visibilitychange firing together) don't double-fetch. This is what makes an
 * installed iOS PWA notice a fresh `dev` (or production) deploy instead of silently running a
 * stale bundle it loaded on last launch.
 *
 * App-agnostic: takes the currently-running build's sha and calls back when a different one
 * is live. Belongs in `@sdee/pwa-env`.
 */
import { useEffect, useRef, useState } from 'react';

const MIN_INTERVAL_MS = 60_000;

export interface UpdateInfo {
  sha: string;
  version: string;
}

export function useUpdateCheck(currentSha: string, endpoint = '/api/build'): UpdateInfo | null {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const lastCheck = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const now = Date.now();
      if (now - lastCheck.current < MIN_INTERVAL_MS) return;
      lastCheck.current = now;
      try {
        const res = await fetch(endpoint, { cache: 'no-store' });
        if (!res.ok) return;
        const info = (await res.json()) as UpdateInfo;
        if (!cancelled && info.sha && info.sha !== currentSha) setUpdate(info);
      } catch {
        // Offline or transient failure — next trigger tries again. Never surface this as an
        // error; a missed check just means the toast appears a little later.
      }
    };

    check();
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    window.addEventListener('online', check);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
      window.removeEventListener('online', check);
    };
  }, [currentSha, endpoint]);

  return update;
}
