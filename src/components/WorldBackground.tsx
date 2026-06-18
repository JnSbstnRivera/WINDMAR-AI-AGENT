'use client';

/**
 * Fondo "mundo" estilo moon-chat — cubre TODA la ventana (detrás del sidebar y
 * del chat). Tiene DOS variantes para que el texto siempre se lea:
 *   • Modo claro = "planeta de día": cielo claro + domo azul suave + sol tenue.
 *   • Modo oscuro = "planeta de noche": fondo negro + esfera azul + media luna
 *     blanca + estrellas. (overrides bajo el selector `.dark`).
 * El arco brillante va abajo (≈60%) para no lavar el texto de los mensajes.
 *
 * Se monta a nivel raíz en ChatApp como capa `absolute inset-0 z-0`; el sidebar
 * y el chat van con z-10 encima. El sidebar es translúcido → el mundo se ve.
 */
export function WorldBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="world-bg" />
      <div className="world-stars">
        <span style={{ left: '6%', top: '10%' }} />
        <span style={{ left: '13%', top: '28%', animationDelay: '1.1s' }} />
        <span style={{ left: '19%', top: '16%', animationDelay: '2.3s' }} />
        <span style={{ left: '27%', top: '38%', animationDelay: '0.6s' }} />
        <span style={{ left: '33%', top: '9%', animationDelay: '1.8s' }} />
        <span style={{ left: '40%', top: '24%', animationDelay: '3.1s' }} />
        <span style={{ left: '47%', top: '15%', animationDelay: '0.9s' }} />
        <span style={{ left: '54%', top: '30%', animationDelay: '2.7s' }} />
        <span style={{ left: '61%', top: '8%', animationDelay: '1.4s' }} />
        <span style={{ left: '68%', top: '22%', animationDelay: '3.6s' }} />
        <span style={{ left: '74%', top: '36%', animationDelay: '0.4s' }} />
        <span style={{ left: '80%', top: '12%', animationDelay: '2.1s' }} />
        <span style={{ left: '86%', top: '26%', animationDelay: '1.7s' }} />
        <span style={{ left: '92%', top: '17%', animationDelay: '3.3s' }} />
        <span style={{ left: '23%', top: '44%', animationDelay: '2.0s' }} />
        <span style={{ left: '58%', top: '42%', animationDelay: '0.8s' }} />
      </div>
      <div className="world-aura" />
      <div className="world-moon" />
      <div className="world-rim" />
      <span className="world-ember world-ember-1" />
      <span className="world-ember world-ember-2" />
      <span className="world-ember world-ember-3" />
      <span className="world-ember world-ember-4" />
      <span className="world-ember world-ember-5" />

      <style>{`
        /* ════════ MODO CLARO — planeta de día (legible con texto oscuro) ════════ */
        .world-bg {
          position: absolute; inset: 0;
          background:
            radial-gradient(100% 70% at 50% 122%, rgba(120,170,240,0.32) 0%, transparent 62%),
            linear-gradient(180deg, #eef4fc 0%, #e2ecf8 100%);
        }
        .world-aura {
          position: absolute; left: 50%; top: 56%;
          transform: translateX(-50%);
          width: min(1400px, 150vw); height: 560px;
          background: radial-gradient(50% 70% at 50% 40%,
            rgba(255,255,255,0.45) 0%,
            rgba(120,170,240,0.22) 38%,
            transparent 78%);
          filter: blur(50px);
          animation: worldAuraPulse 6s ease-in-out infinite;
        }
        .world-moon {
          position: absolute; left: 50%; top: 60%;
          transform: translateX(-50%);
          width: min(1700px, 200vw); height: min(1700px, 200vw);
          border-radius: 50%;
          background: radial-gradient(115% 100% at 50% 0%,
            rgba(255,255,255,0.85) 0%,
            rgba(206,226,255,0.62) 6%,
            rgba(120,170,240,0.42) 18%,
            rgba(70,120,210,0.26) 34%,
            rgba(120,160,220,0.10) 52%,
            transparent 66%);
          animation: worldMoonRise 9s ease-in-out infinite;
        }
        .world-rim {
          position: absolute; left: 50%; top: 60%;
          transform: translateX(-50%);
          width: min(1700px, 200vw); height: min(1700px, 200vw);
          border-radius: 50%; background: transparent;
          box-shadow:
            0 0 3px 1px rgba(255,255,255,0.85),
            0 0 28px 6px rgba(150,190,255,0.45),
            0 0 110px 34px rgba(120,160,230,0.26);
          animation: worldRimGlow 4.5s ease-in-out infinite;
        }
        /* estrellas en AMBOS modos: amarillo WH de día, blancas de noche */
        .world-stars span {
          position: absolute; width: 3px; height: 3px; border-radius: 50%;
          background: #F4B73E; box-shadow: 0 0 7px 1.5px rgba(247,148,29,0.75);
          opacity: 0.7; animation: worldTwinkle 3.4s ease-in-out infinite;
        }
        .world-ember {
          position: absolute; bottom: 26%; width: 4px; height: 4px; border-radius: 50%;
          background: rgb(255,255,255); box-shadow: 0 0 9px 2px rgba(150,190,255,0.7);
          opacity: 0; animation: worldEmber 6s ease-in-out infinite;
        }
        .world-ember-1 { left: 31%; animation-delay: 0s; }
        .world-ember-2 { left: 44%; animation-delay: 1.4s; width: 3px; height: 3px; }
        .world-ember-3 { left: 57%; animation-delay: 2.8s; }
        .world-ember-4 { left: 67%; animation-delay: 4.1s; width: 3px; height: 3px; }
        .world-ember-5 { left: 38%; animation-delay: 5.2s; }

        /* ════════ MODO OSCURO — planeta de noche (brillo atenuado) ════════ */
        .dark .world-bg {
          background:
            radial-gradient(90% 55% at 50% 120%, rgba(29,66,155,0.16) 0%, transparent 60%),
            #04060d;
        }
        .dark .world-aura {
          background: radial-gradient(50% 70% at 50% 40%,
            rgba(150,190,255,0.16) 0%,
            rgba(43,92,190,0.20) 36%,
            rgba(29,66,155,0.08) 60%,
            transparent 82%);
        }
        .dark .world-moon {
          background: radial-gradient(115% 100% at 50% 0%,
            rgba(235,242,255,0.60) 0%,
            rgba(150,190,255,0.40) 5%,
            rgba(70,120,205,0.36) 16%,
            rgba(43,92,190,0.26) 32%,
            rgba(20,45,110,0.14) 50%,
            transparent 66%);
        }
        .dark .world-rim {
          box-shadow:
            0 0 3px 1px rgba(235,242,255,0.55),
            0 0 28px 6px rgba(120,165,240,0.32),
            0 0 110px 32px rgba(43,92,190,0.24);
        }
        .dark .world-stars span { width: 2px; height: 2px; background: #fff; box-shadow: 0 0 6px 1px rgba(255,255,255,0.85); }
        .dark .world-ember {
          background: rgb(208,228,255);
          box-shadow: 0 0 9px 2px rgba(130,175,255,0.85);
        }

        /* ════════ animaciones ════════ */
        @keyframes worldAuraPulse { 0%,100% { opacity: 0.8; } 50% { opacity: 1; } }
        @keyframes worldMoonRise {
          0%,100% { transform: translateX(-50%) translateY(0); }
          50%     { transform: translateX(-50%) translateY(-10px); }
        }
        @keyframes worldRimGlow {
          0%,100% { filter: brightness(0.92); }
          50%     { filter: brightness(1.12); }
        }
        @keyframes worldTwinkle { 0%,100% { opacity: 0.12; transform: scale(0.7); } 50% { opacity: 0.95; transform: scale(1.2); } }
        @keyframes worldEmber {
          0%   { transform: translateY(0) scale(0.6); opacity: 0; }
          15%  { opacity: 0.85; }
          70%  { opacity: 0.45; }
          100% { transform: translateY(-170px) scale(0.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
