'use client';

import { useEffect, useState } from 'react';

/**
 * Visualizador de dictado por voz (estilo AIVoiceInput de 21st.dev): barras tipo
 * onda animadas + temporizador + "Escuchando…". Se muestra mientras la Web Speech
 * API transcribe (estado `listening` del ChatInput). Puramente visual.
 */
const BARS = 28;

export function VoiceVisualizer() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');

  return (
    <div className="voice-viz">
      <span className="voice-dot" aria-hidden />
      <span className="voice-time">{mm}:{ss}</span>
      <div className="voice-bars" aria-hidden>
        {Array.from({ length: BARS }).map((_, i) => (
          <span key={i} className="voice-bar" style={{ animationDelay: `${(i % 10) * 0.08}s` }} />
        ))}
      </div>
      <span className="voice-label">Escuchando…</span>

      <style>{`
        .voice-viz {
          display: flex; align-items: center; gap: 10px;
          width: 100%; padding: 6px 10px 8px;
          color: #F7941D;
        }
        .voice-dot {
          width: 9px; height: 9px; border-radius: 50%; background: #ef4444; flex-shrink: 0;
          box-shadow: 0 0 0 0 rgba(239,68,68,0.6); animation: vDot 1.3s ease-in-out infinite;
        }
        .voice-time { font-size: 12px; font-variant-numeric: tabular-nums; color: #94a3b8; flex-shrink: 0; min-width: 36px; }
        .voice-bars { display: flex; align-items: center; gap: 3px; height: 28px; flex: 1; min-width: 0; overflow: hidden; }
        .voice-bar {
          flex: 1; min-width: 2px; max-width: 4px; height: 100%; border-radius: 2px;
          background: linear-gradient(180deg, #F7941D, #e8830d);
          transform: scaleY(0.22); transform-origin: center;
          animation: vBar 0.9s ease-in-out infinite;
        }
        .voice-label {
          font-size: 12.5px; font-weight: 600; letter-spacing: 0.01em; flex-shrink: 0;
          background: linear-gradient(90deg, #94a3b8 0%, #94a3b8 35%, #F7941D 50%, #94a3b8 65%, #94a3b8 100%);
          background-size: 220% 100%;
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
          animation: vShimmer 1.8s linear infinite;
        }
        @keyframes vBar { 0%,100% { transform: scaleY(0.22); } 50% { transform: scaleY(1); } }
        @keyframes vDot { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.6); } 50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); } }
        @keyframes vShimmer { 0% { background-position: 220% 0; } 100% { background-position: -220% 0; } }
        @media (prefers-reduced-motion: reduce) {
          .voice-bar, .voice-dot, .voice-label { animation: none; }
          .voice-bar { transform: scaleY(0.6); }
          .voice-label { color: #F7941D; -webkit-text-fill-color: #F7941D; }
        }
      `}</style>
    </div>
  );
}
