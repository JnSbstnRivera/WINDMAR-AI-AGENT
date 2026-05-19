'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Theme toggle del panel admin con efecto ripple (técnica "shrink-into-button").
 * Funciona dentro de .admin-root mediante atributo data-theme.
 *
 * Técnica:
 *  1. Lee la posición del botón
 *  2. Pinta el overlay con el color del tema ACTUAL (full-screen, instantáneo)
 *  3. Cambia data-theme inmediatamente → la página se actualiza por debajo
 *  4. Anima el overlay contrayéndose hacia el botón → revela el nuevo tema
 *
 * Persiste la preferencia en localStorage (`wh-admin-theme`).
 */
export function AdminThemeToggle() {
  // El estado inicial debe matchear lo que pintó el server (dark por defecto).
  // El useEffect inferior actualiza al valor real de localStorage tras mount.
  const [isDark, setIsDark] = useState(true);
  const busy = useRef(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Al montar, leer preferencia previa
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wh-admin-theme');
      if (saved === 'light') {
        setIsDark(false);
        const root = document.querySelector('.admin-root');
        root?.setAttribute('data-theme', 'light');
      }
    } catch {
      /* localStorage bloqueado — usar default dark */
    }
  }, []);

  function toggle() {
    if (busy.current) return;
    busy.current = true;

    const btn = btnRef.current;
    const ripple = document.getElementById('ad-ripple');
    const root = document.querySelector<HTMLElement>('.admin-root');
    if (!btn || !ripple || !root) {
      busy.current = false;
      return;
    }

    const rect = btn.getBoundingClientRect();
    const cx = Math.round(rect.left + rect.width / 2);
    const cy = Math.round(rect.top + rect.height / 2);

    // 1. Color del tema ACTUAL (el que vamos a "dejar atrás")
    const oldBg = isDark ? '#060810' : '#f0f4ff';

    // 2. Pintar overlay full-screen sin transición
    ripple.style.transition = 'none';
    ripple.style.background = oldBg;
    ripple.style.clipPath = `circle(160vmax at ${cx}px ${cy}px)`;

    // 3. Cambiar tema bajo el overlay
    const next = !isDark;
    setIsDark(next);
    root.setAttribute('data-theme', next ? 'dark' : 'light');
    try {
      localStorage.setItem('wh-admin-theme', next ? 'dark' : 'light');
    } catch {
      /* ignore */
    }

    // 4. Próximo frame: animar contracción
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        ripple.style.transition = 'clip-path 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        ripple.style.clipPath = `circle(0px at ${cx}px ${cy}px)`;
        setTimeout(() => {
          busy.current = false;
        }, 650);
      });
    });
  }

  return (
    <button
      ref={btnRef}
      onClick={toggle}
      className="ad-theme-btn"
      aria-label="Cambiar tema"
      title="Cambiar tema (claro/oscuro)"
    >
      <span className="ad-theme-icon" key={isDark ? 'd' : 'l'}>
        {isDark ? '🌙' : '☀️'}
      </span>
    </button>
  );
}
