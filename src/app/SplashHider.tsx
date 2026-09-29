'use client';

import { useEffect } from 'react';

export default function SplashHider() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        void navigator.serviceWorker.register("/sw.js").catch((error) => {
          console.error("Service worker registration failed", error);
        });
      } else {
        // The worker caches /_next/ chunks, which makes dev edits look like they
        // didn't apply. Remove any worker and caches left from a previous run.
        void navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => void r.unregister()));
        if ("caches" in window) void caches.keys().then((keys) => keys.forEach((k) => void caches.delete(k)));
      }
    }

    const timeout = setTimeout(() => {
      const splash = document.getElementById('splash-screen');
      if (splash) {
        splash.style.opacity = '0';
        splash.style.visibility = 'hidden';
        setTimeout(() => splash.remove(), 600);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, []);

  return null;
}
