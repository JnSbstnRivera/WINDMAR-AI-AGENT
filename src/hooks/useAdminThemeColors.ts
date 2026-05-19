'use client';

import { useEffect, useState } from 'react';

interface AdminChartColors {
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  /** Texto secundario (legendas, etc.) */
  text2: string;
}

/**
 * Devuelve los colores apropiados para gráficas de Recharts según el tema actual.
 * Recharts NO admite CSS variables en sus props (axisLine, stroke, contentStyle),
 * así que necesitamos resolver los valores en JS leyendo el class `dark` de <html>.
 *
 * Escucha cambios de tema via MutationObserver — al hacer toggle, los charts se
 * re-pintan automáticamente.
 */
export function useAdminThemeColors(): AdminChartColors {
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof document === 'undefined') return true;
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const update = () => setDark(document.documentElement.classList.contains('dark'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  if (dark) {
    return {
      grid: 'rgba(255, 255, 255, 0.05)',
      axis: 'rgba(232, 237, 248, 0.4)',
      tooltipBg: '#111827',
      tooltipBorder: 'rgba(255, 255, 255, 0.09)',
      tooltipText: '#e8edf8',
      text2: 'rgba(232, 237, 248, 0.55)',
    };
  }
  return {
    grid: 'rgba(15, 23, 42, 0.1)',
    axis: 'rgba(15, 23, 42, 0.55)',
    tooltipBg: '#ffffff',
    tooltipBorder: 'rgba(15, 23, 42, 0.15)',
    tooltipText: '#0f172a',
    text2: 'rgba(15, 23, 42, 0.7)',
  };
}
