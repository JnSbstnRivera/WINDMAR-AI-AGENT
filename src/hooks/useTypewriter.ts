'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Hook que muestra texto carácter por carácter a velocidad uniforme,
 * aunque el texto fuente llegue en chunks irregulares (típico de streaming).
 *
 * Estrategia adaptativa:
 * - Si el buffer entre `target` y mostrado es pequeño → typewriter lento (fluido)
 * - Si el buffer crece (stream se adelantó) → typewriter acelera para no quedarse atrás
 * - Cuando `isStreaming=false`, completa todo el texto restante al final
 *
 * Resultado: el usuario ve flujo CONSTANTE de texto, sin las "pausas" típicas
 * cuando Anthropic manda chunks en bloques grandes.
 *
 * @param target - texto completo recibido hasta ahora (acumulado)
 * @param isStreaming - true mientras el stream está activo
 * @returns texto que se debe renderizar AHORA (subset progresivo de target)
 */
export function useTypewriter(target: string, isStreaming: boolean): string {
  const [displayed, setDisplayed] = useState('');
  const targetRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  // Mantenemos el target actual en una ref para que el loop lo lea siempre fresco
  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  // Cuando termina streaming, SIEMPRE mostrar todo el target inmediatamente.
  // Sin esto, el typewriter podría seguir "tipeando" después de que el stream
  // terminó si se había quedado atrás (efecto "lento al final").
  useEffect(() => {
    if (!isStreaming) {
      setDisplayed(targetRef.current);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
  }, [isStreaming]);

  // Loop de animación: avanza el displayed hacia el target a velocidad adaptativa.
  // Velocidades calibradas para Haiku 4.5 (~600-800 cps real):
  //  - Buffer pequeño (<20): 2 chars/frame (~120 cps) — fluido cómodo
  //  - Buffer mediano (20-80): 6 chars/frame (~360 cps) — al ritmo del stream
  //  - Buffer grande (80-200): 12 chars/frame (~720 cps) — alcanza streams normales
  //  - Buffer enorme (>200): 20 chars/frame (~1200 cps) — recupera atrasos
  useEffect(() => {
    if (!isStreaming) return;

    const tick = () => {
      setDisplayed((current) => {
        const t = targetRef.current;
        if (current.length >= t.length) {
          rafRef.current = requestAnimationFrame(tick);
          return current;
        }

        const buffer = t.length - current.length;
        const charsPerFrame =
          buffer > 200 ? 20 :
          buffer > 80  ? 12 :
          buffer > 20  ? 6  :
                         2;
        const nextLen = Math.min(current.length + charsPerFrame, t.length);

        rafRef.current = requestAnimationFrame(tick);
        return t.slice(0, nextLen);
      });
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isStreaming]);

  return displayed;
}
