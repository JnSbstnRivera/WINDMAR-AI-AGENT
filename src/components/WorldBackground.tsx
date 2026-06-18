'use client';

/**
 * Fondo "mundo" estilo moon-chat — cubre TODA la ventana (detrás del sidebar y
 * del chat). Fondo negro + esfera/planeta en gamas de azul Windmar con borde
 * superior blanco nítido (media luna) + estrellas, brasas y glow que respira.
 *
 * Se monta a nivel raíz en ChatApp (solo en la pantalla de bienvenida) como capa
 * `absolute inset-0 z-0`; el sidebar y el chat van con z-10 encima. El sidebar es
 * translúcido para que el mundo se vea a través.
 */
export function WorldBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden hidden dark:block" aria-hidden>
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
        .world-bg {
          position: absolute; inset: 0;
          background:
            radial-gradient(90% 60% at 50% 118%, rgba(29,66,155,0.20) 0%, transparent 60%),
            #04060d;
        }
        .world-aura {
          position: absolute; left: 50%; top: 50%;
          transform: translateX(-50%);
          width: min(1400px, 150vw); height: 600px;
          background: radial-gradient(50% 70% at 50% 30%,
            rgba(190,216,255,0.24) 0%,
            rgba(43,92,190,0.28) 32%,
            rgba(29,66,155,0.12) 58%,
            transparent 80%);
          filter: blur(48px);
          animation: worldAuraPulse 6s ease-in-out infinite;
        }
        .world-moon {
          position: absolute; left: 50%; top: 53%;
          transform: translateX(-50%);
          width: min(1700px, 200vw); height: min(1700px, 200vw);
          border-radius: 50%;
          background: radial-gradient(115% 100% at 50% 0%,
            rgba(255,255,255,0.95) 0%,
            rgba(214,232,255,0.70) 4%,
            rgba(90,150,235,0.55) 14%,
            rgba(43,92,190,0.45) 30%,
            rgba(20,45,110,0.20) 50%,
            transparent 66%);
          animation: worldMoonRise 9s ease-in-out infinite;
        }
        .world-rim {
          position: absolute; left: 50%; top: 53%;
          transform: translateX(-50%);
          width: min(1700px, 200vw); height: min(1700px, 200vw);
          border-radius: 50%; background: transparent;
          box-shadow:
            0 0 3px 1px rgba(255,255,255,0.95),
            0 0 34px 6px rgba(150,190,255,0.50),
            0 0 130px 36px rgba(43,92,190,0.38);
          animation: worldRimGlow 4.5s ease-in-out infinite;
        }
        .world-stars span {
          position: absolute; width: 2px; height: 2px; border-radius: 50%;
          background: #fff; box-shadow: 0 0 6px 1px rgba(255,255,255,0.8);
          opacity: 0.4; animation: worldTwinkle 3.4s ease-in-out infinite;
        }
        .world-ember {
          position: absolute; bottom: 22%; width: 4px; height: 4px; border-radius: 50%;
          background: rgb(208,228,255); box-shadow: 0 0 9px 2px rgba(130,175,255,0.9);
          opacity: 0; animation: worldEmber 6s ease-in-out infinite;
        }
        .world-ember-1 { left: 31%; animation-delay: 0s; }
        .world-ember-2 { left: 44%; animation-delay: 1.4s; width: 3px; height: 3px; }
        .world-ember-3 { left: 57%; animation-delay: 2.8s; }
        .world-ember-4 { left: 67%; animation-delay: 4.1s; width: 3px; height: 3px; }
        .world-ember-5 { left: 38%; animation-delay: 5.2s; }
        @keyframes worldAuraPulse { 0%,100% { opacity: 0.8; } 50% { opacity: 1; } }
        @keyframes worldMoonRise {
          0%,100% { transform: translateX(-50%) translateY(0); }
          50%     { transform: translateX(-50%) translateY(-10px); }
        }
        @keyframes worldRimGlow {
          0%,100% {
            box-shadow:
              0 0 3px 1px rgba(255,255,255,0.90),
              0 0 30px 5px rgba(150,190,255,0.45),
              0 0 120px 30px rgba(43,92,190,0.32);
          }
          50% {
            box-shadow:
              0 0 6px 2px rgba(255,255,255,1),
              0 0 54px 9px rgba(170,205,255,0.72),
              0 0 165px 48px rgba(43,92,190,0.50);
          }
        }
        @keyframes worldTwinkle { 0%,100% { opacity: 0.12; transform: scale(0.7); } 50% { opacity: 0.95; transform: scale(1.2); } }
        @keyframes worldEmber {
          0%   { transform: translateY(0) scale(0.6); opacity: 0; }
          15%  { opacity: 0.9; }
          70%  { opacity: 0.5; }
          100% { transform: translateY(-170px) scale(0.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
