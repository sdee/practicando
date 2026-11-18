'use client';

import { useEffect } from 'react';

// Minimal SW registration so the spike is installable and the shell works
// offline. The SW itself (public/sw.js) is a small cache-first runtime cache.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* spike: ignore registration errors */
      });
    }
  }, []);
  return null;
}
