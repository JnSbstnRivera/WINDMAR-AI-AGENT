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

  // Cuando termina streaming, asegurar que mostramos TODO el target
  useEffect(() => {
    if (!isStreaming) {
      setDisplayed(targetRef.current);
    }
  }, [isStreaming]);

  // Loop de animación: avanza el displayed hacia el target a velocidad adaptativa
  useEffect(() => {
    if (!isStreaming) return;

    const tick = () => {
      setDisplayed((current) => {
        const t = targetRef.current;
        if (current.length >= t.length) {
          // Ya alcanzamos al target — esperar próximo chunk
          rafRef.current = requestAnimationFrame(tick);
          return current;
        }

        // Velocidad adaptativa:
        //  - Buffer pequeño (<20 chars): typewriter cómodo (~2 chars/frame ≈ 120 char/s)
        //  - Buffer mediano (20-100): 4 chars/frame (~240 char/s)
        //  - Buffer grande (>100): 8 chars/frame (~480 char/s — alcanza streams rápidos)
        const buffer = t.length - current.length;
        const charsPerFrame = buffer > 100 ? 8 : buffer > 20 ? 4 : 2;
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
