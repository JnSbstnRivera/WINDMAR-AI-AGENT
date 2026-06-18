'use client';

/**
 * Indicador de "pensando" con efecto shimmer (estilo Cooking de 21st.dev):
 * un solecito WH girando + texto con un brillo naranja que barre de izq. a der.
 * Reemplaza los 3 puntos del skeleton mientras el bot prepara la respuesta.
 */
export function ShimmerLoader({ label = 'Pensando' }: { label?: string }) {
  return (
    <span className="shimmer-loader" aria-label="Generando respuesta">
      <svg className="shimmer-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
      </svg>
      <span className="shimmer-text">{label}…</span>
      <svg className="shimmer-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points="9 18 15 12 9 6" />
      </svg>

      <style>{`
        .shimmer-loader {
          --sh-base: #94a3b8;
          --sh-hi: #F7941D;
          display: inline-flex; align-items: center; gap: 8px; padding: 2px 0;
        }
        .shimmer-sun { color: #F7941D; animation: shSpin 3.2s linear infinite; flex-shrink: 0; }
        .shimmer-chevron { color: var(--sh-base); flex-shrink: 0; opacity: 0.7; }
        .shimmer-text {
          font-size: 14px; font-weight: 600; letter-spacing: 0.01em;
          background: linear-gradient(90deg,
            var(--sh-base) 0%, var(--sh-base) 35%,
            var(--sh-hi) 50%,
            var(--sh-base) 65%, var(--sh-base) 100%);
          background-size: 220% 100%;
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
          animation: shMove 1.8s linear infinite;
        }
        @keyframes shMove { 0% { background-position: 220% 0; } 100% { background-position: -220% 0; } }
        @keyframes shSpin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .shimmer-sun, .shimmer-text { animation: none; }
          .shimmer-text { color: var(--sh-hi); -webkit-text-fill-color: var(--sh-hi); }
        }
      `}</style>
    </span>
  );
}
