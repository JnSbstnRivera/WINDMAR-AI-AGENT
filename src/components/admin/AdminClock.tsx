'use client';

import { useEffect, useState } from 'react';

/**
 * Reloj en vivo del topbar admin — hora local Puerto Rico (UTC-4).
 * Server render muestra placeholder para evitar hydration mismatch.
 */
export function AdminClock() {
  const [time, setTime] = useState<string>('--:--:--');

  useEffect(() => {
    function update() {
      setTime(new Date().toLocaleTimeString('es-PR', { hour12: false }));
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return <div className="ad-clock">{time}</div>;
}
