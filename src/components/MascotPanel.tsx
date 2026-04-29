// MascotPanel — SUN BOT con estados dinámicos
// Cambia imagen según contexto + animaciones sutiles tipo tech
// Sin subtítulos ni labels — solo visual

import { useEffect, useState } from 'react';

export type MascotState = 'idle' | 'typing' | 'thinking' | 'happy' | 'error' | 'loading';

interface Props {
  state?: MascotState;
  sidebarHidden?: boolean;
}

const STATE_CONFIG: Record<MascotState, {
  src: string;
  haloAlpha: number;
  haloColor: string;        // RGB sin alpha
  animClass: string;
  showTechRing: boolean;    // anillo giratorio para estados activos
}> = {
  idle:     { src: '/sunbot.png',             haloAlpha: 0.50, haloColor: '247,148,29', animClass: 'mascot-breathe',     showTechRing: false },
  typing:   { src: '/sunbot-escribiendo.png', haloAlpha: 0.55, haloColor: '247,148,29', animClass: 'mascot-pulse-fast',  showTechRing: false },
  thinking: { src: '/sunbot-pensando.png',    haloAlpha: 0.65, haloColor: '247,148,29', animClass: 'mascot-pulse-tech',  showTechRing: true },
  happy:    { src: '/sunbot-feliz.png',       haloAlpha: 0.70, haloColor: '247,148,29', animClass: 'mascot-celebrate',   showTechRing: false },
  error:    { src: '/sunbot-error.png',       haloAlpha: 0.55, haloColor: '220,80,80',  animClass: 'mascot-error-shake', showTechRing: false },
  loading:  { src: '/sunbot-cargando.png',    haloAlpha: 0.60, haloColor: '247,148,29', animClass: 'mascot-breathe',     showTechRing: true },
};

export function MascotPanel({ state = 'idle', sidebarHidden = false }: Props) {
  const config = STATE_CONFIG[state];
  // SUN BOT centrado entre sidebar (256px) y chat (centrado horizontalmente)
  // Cuando sidebar visible: gap entre 256px y main content → centro ~260px
  // Cuando sidebar oculto: pegado a la izquierda con margen
  const desktopLeft = sidebarHidden ? 'left-[120px]' : 'left-[450px]';

  // Crossfade entre imágenes al cambiar de estado
  const [visibleSrc, setVisibleSrc] = useState(config.src);
  const [imgOpacity, setImgOpacity] = useState(1);

  useEffect(() => {
    if (visibleSrc === config.src) return;
    setImgOpacity(0);
    const t = setTimeout(() => {
      setVisibleSrc(config.src);
      setImgOpacity(1);
    }, 180);
    return () => clearTimeout(t);
  }, [config.src, visibleSrc]);

  const haloBg = `radial-gradient(circle, rgba(${config.haloColor},${config.haloAlpha}) 0%, rgba(${config.haloColor},${config.haloAlpha * 0.3}) 50%, transparent 75%)`;
  const techRingBg = `conic-gradient(from 0deg, transparent 0%, rgba(${config.haloColor},0.45) 30%, transparent 60%)`;

  return (
    <>
      {/* Desktop — bottom-left (lado izquierdo), tamaño aumentado significativamente */}
      <div className={`hidden md:flex fixed ${desktopLeft} bottom-28 z-30 items-center justify-center transition-all duration-300`}>
        <div className="relative" style={{ width: 130, height: 130 }}>
          {/* Halo principal con animación */}
          <div
            className={`absolute inset-0 rounded-full ${config.animClass}`}
            style={{ background: haloBg, filter: 'blur(14px)' }}
          />

          {/* Halo blanco interno (efecto brillante) */}
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 60%)' }}
          />

          {/* Tech ring rotativo (solo en thinking/loading) */}
          {config.showTechRing && (
            <div
              className="absolute inset-0 rounded-full mascot-spin"
              style={{
                background: techRingBg,
                filter: 'blur(3px)',
              }}
            />
          )}

          {/* Imagen mascota */}
          <img
            src={visibleSrc}
            alt="Windmar Sun Bot"
            className="mascot-img object-contain drop-shadow-xl"
            style={{
              imageRendering: 'pixelated',
              opacity: imgOpacity,
              transition: 'opacity 0.18s ease',
              width: 108,
              height: 108,
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
            }}
          />

          {/* Pixel dots flotando (efecto tech sutil) */}
          {(state === 'thinking' || state === 'typing') && (
            <>
              <span className="mascot-particle particle-1" style={{ background: `rgb(${config.haloColor})` }} />
              <span className="mascot-particle particle-2" style={{ background: `rgb(${config.haloColor})` }} />
              <span className="mascot-particle particle-3" style={{ background: `rgb(${config.haloColor})` }} />
            </>
          )}
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden fixed bottom-16 left-2 z-30">
        <div className="relative" style={{ width: 68, height: 68 }}>
          <div
            className={`absolute inset-0 rounded-full ${config.animClass}`}
            style={{ background: haloBg, filter: 'blur(10px)' }}
          />
          {config.showTechRing && (
            <div
              className="absolute inset-0 rounded-full mascot-spin"
              style={{ background: techRingBg, filter: 'blur(2px)' }}
            />
          )}
          <img
            src={visibleSrc}
            alt="Windmar Sun Bot"
            className="mascot-img object-contain drop-shadow-lg"
            style={{
              imageRendering: 'pixelated',
              opacity: imgOpacity,
              transition: 'opacity 0.18s ease',
              width: 56,
              height: 56,
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
            }}
          />
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes mascot-breathe {
          0%, 100% { opacity: 0.6;  transform: scale(1); }
          50%       { opacity: 1;    transform: scale(1.08); }
        }
        @keyframes mascot-pulse-fast {
          0%, 100% { opacity: 0.55; transform: scale(0.98); }
          50%       { opacity: 1;    transform: scale(1.14); }
        }
        @keyframes mascot-pulse-tech {
          0%, 100% { opacity: 0.7;  transform: scale(1); }
          25%      { opacity: 0.85; transform: scale(1.06); }
          50%       { opacity: 1;    transform: scale(1.18); }
          75%      { opacity: 0.85; transform: scale(1.06); }
        }
        @keyframes mascot-celebrate {
          0%   { opacity: 0.7; transform: scale(1); }
          30%  { opacity: 1;   transform: scale(1.22); }
          60%  { opacity: 1;   transform: scale(1.1); }
          100% { opacity: 0.85; transform: scale(1); }
        }
        @keyframes mascot-error-shake {
          0%, 100% { opacity: 0.6; transform: translateX(0); }
          20%       { transform: translateX(-3px); }
          40%       { transform: translateX(3px); }
          60%       { transform: translateX(-2px); }
          80%       { transform: translateX(2px); }
        }
        @keyframes mascot-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        .mascot-breathe     { animation: mascot-breathe 2.8s ease-in-out infinite; }
        .mascot-pulse-fast  { animation: mascot-pulse-fast 0.9s ease-in-out infinite; }
        .mascot-pulse-tech  { animation: mascot-pulse-tech 1.6s ease-in-out infinite; }
        .mascot-celebrate   { animation: mascot-celebrate 1.4s ease-out forwards; }
        .mascot-error-shake { animation: mascot-error-shake 0.5s ease-in-out 2; }
        .mascot-spin        { animation: mascot-spin 2.6s linear infinite; }

        /* Pixel particles para tech feel */
        .mascot-particle {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          opacity: 0;
          z-index: 5;
          box-shadow: 0 0 6px currentColor;
        }
        .particle-1 {
          top: 12%;  left: 15%;
          animation: particleFloat 2.4s ease-in-out 0s infinite;
        }
        .particle-2 {
          top: 18%;  right: 12%;
          animation: particleFloat 2.4s ease-in-out 0.6s infinite;
        }
        .particle-3 {
          bottom: 16%; right: 18%;
          animation: particleFloat 2.4s ease-in-out 1.2s infinite;
        }
        @keyframes particleFloat {
          0%   { transform: translateY(0)    scale(0.5); opacity: 0; }
          30%  { transform: translateY(-8px) scale(1);   opacity: 0.9; }
          70%  { transform: translateY(-14px) scale(0.8); opacity: 0.6; }
          100% { transform: translateY(-20px) scale(0.4); opacity: 0; }
        }
      `}</style>
    </>
  );
}
