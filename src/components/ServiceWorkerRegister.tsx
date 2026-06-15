'use client';

import { useEffect } from 'react';

// Registra el service worker en el cliente para habilitar la instalación PWA.
// Solo en producción para no interferir con el HMR de `next dev`.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('SW registration failed:', err);
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  // ── Auto-actualización por versión ──────────────────────────────────
  // El PWA cachea el JS; sin esto, el asesor seguía viendo la versión vieja
  // tras cada deploy. Comparamos el SHA horneado en este bundle contra el SHA
  // del deploy vivo (/api/version). Si difieren → recargamos. Solo al (re)enfocar
  // la pestaña para no interrumpir mientras escribe.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    const mySha = process.env.NEXT_PUBLIC_COMMIT_SHA;
    if (!mySha || mySha === 'dev') return;

    let reloaded = false;
    const check = async () => {
      if (reloaded || document.visibilityState !== 'visible') return;
      try {
        const r = await fetch('/api/version', { cache: 'no-store' });
        if (!r.ok) return;
        const { sha } = (await r.json()) as { sha?: string };
        if (sha && sha !== mySha) {
          reloaded = true;
          window.location.reload();
        }
      } catch {
        /* sin red / error: reintenta en el próximo foco */
      }
    };

    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    check(); // chequeo inicial
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return null;
}
