'use client';

import { useEffect, useRef, useState } from 'react';

interface Options {
  /** Tiempo total de inactividad permitido en milisegundos. Default: 15 min */
  timeoutMs?: number;
  /** Tiempo antes del logout para mostrar warning. Default: 60 seg */
  warningMs?: number;
  /** Callback que se ejecuta al cumplir el timeout completo */
  onTimeout: () => void;
}

/**
 * Hook que detecta inactividad del usuario y dispara un callback tras `timeoutMs`.
 * Eventos de actividad: mousemove, keydown, click, touchstart, scroll.
 *
 * Devuelve `showWarning` (true en los últimos `warningMs` del timeout) para que
 * la UI pueda mostrar un aviso antes del logout efectivo.
 *
 * Uso típico: logout automático cuando el asesor deja la sesión abierta sin uso
 * (seguridad básica empresarial — evita que alguien más use su PC con la sesión abierta).
 */
export function useInactivityLogout({
  timeoutMs = 15 * 60 * 1000, // 15 minutos
  warningMs = 60 * 1000,       // 1 minuto de aviso
  onTimeout,
}: Options) {
  const [showWarning, setShowWarning] = useState(false);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTimeoutRef = useRef(onTimeout);

  // Mantener onTimeout en una ref para no re-instalar listeners al cambiar
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    const resetTimers = () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setShowWarning(false);

      warningTimerRef.current = setTimeout(() => {
        setShowWarning(true);
      }, timeoutMs - warningMs);

      logoutTimerRef.current = setTimeout(() => {
        onTimeoutRef.current();
      }, timeoutMs);
    };

    const events: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetTimers, { passive: true }));

    // Inicializar timer al montar
    resetTimers();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetTimers));
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [timeoutMs, warningMs]);

  return { showWarning };
}
