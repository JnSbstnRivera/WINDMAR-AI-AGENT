'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Theme toggle del admin — usa el MISMO sistema del chat:
 *  - localStorage key `wh-theme` (compartido)
 *  - class `dark` en <html> (Tailwind dark mode strategy)
 *  - View Transitions API + circular reveal desde el botón
 *
 * Al cambiar el tema en /admin también afecta al chat (un solo tema unificado).
 */
export function AdminThemeToggle() {
  const [dark, setDark] = useState<boolean>(true);
  const [spinning, setSpinning] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Al montar, leer preferencia previa (compartida con el chat)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wh-theme');
      const initial = saved === null ? true : saved === 'dark';
      setDark(initial);
      document.documentElement.classList.toggle('dark', initial);
    } catch {
      /* localStorage bloqueado — default dark */
    }
  }, []);

  // Aplica al <html> y persiste cada vez que cambia
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('wh-theme', dark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }, [dark]);

  function toggleDark() {
    setSpinning(true);
    setTimeout(() => setSpinning(false), 600);

    // Feature detection: View Transitions API (Chrome 111+, Edge, Opera)
    const startViewTransition = (document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> };
    }).startViewTransition;

    if (!startViewTransition || !btnRef.current) {
      setDark((d) => !d);
      return;
    }

    const rect = btnRef.current.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    document.documentElement.style.setProperty('--wm-reveal-x', `${x}px`);
    document.documentElement.style.setProperty('--wm-reveal-y', `${y}px`);
    document.documentElement.style.setProperty('--wm-reveal-r', `${endRadius}px`);

    const transition = startViewTransition.call(document, () => {
      setDark((d) => !d);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 600,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });
  }

  return (
    <button
      ref={btnRef}
      onClick={toggleDark}
      className="ad-theme-btn"
      aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={dark ? 'Modo claro' : 'Modo oscuro'}
    >
      <span
        style={{
          display: 'inline-block',
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: spinning ? 'rotate(180deg)' : 'rotate(0deg)',
        }}
      >
        {dark ? (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F7941D" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1B3A5C" strokeWidth="2" strokeLinecap="round">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        )}
      </span>
    </button>
  );
}
