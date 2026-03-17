'use client';

import { useEffect } from 'react';

export default function SplashHider() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed", error);
      });
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
