import { useEffect, useState } from 'react';

export type MascotState = 'greeting' | 'thinking' | 'pointing' | 'love';

interface Props {
  state: MascotState;
}

const MASCOT_CONFIG: Record<MascotState, { src: string; label: string; animation: string }> = {
  greeting: { src: '/Saludando.png',  label: '¡Hola!',       animation: 'wave' },
  thinking: { src: '/Pensando.png',   label: 'Pensando...',  animation: 'pulse' },
  pointing: { src: '/Señalando.png',  label: '¡Aquí está!',  animation: 'bounce' },
  love:     { src: '/Amor.png',       label: '¡Enviando!',   animation: 'heartbeat' },
};

export function MascotPanel({ state }: Props) {
  const [visibleSrc, setVisibleSrc]     = useState(MASCOT_CONFIG[state].src);
  const [visibleLabel, setVisibleLabel] = useState(MASCOT_CONFIG[state].label);
  const [opacity, setOpacity]           = useState(1);
  const [animKey, setAnimKey]           = useState(0);

  useEffect(() => {
    setOpacity(0);
    const t = setTimeout(() => {
      setVisibleSrc(MASCOT_CONFIG[state].src);
      setVisibleLabel(MASCOT_CONFIG[state].label);
      setAnimKey(k => k + 1);
      setOpacity(1);
    }, 180);
    return () => clearTimeout(t);
  }, [state]);

  const anim = MASCOT_CONFIG[state].animation;

  return (
    <>
      {/* Desktop: fixed left side, just after sidebar (sidebar = 256px) */}
      <div className="hidden md:flex fixed left-[268px] top-1/2 -translate-y-1/2 z-30 flex-col items-center gap-1">
        <div style={{ transition: 'opacity 0.18s ease', opacity }} className="flex flex-col items-center">
          <div key={animKey} style={{ animation: `mascot-${anim} 2s ease-in-out infinite` }}>
            <img
              src={visibleSrc}
              alt="Windmar Assistant"
              className="w-20 h-20 object-contain drop-shadow-xl"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          <span
            className="text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(27,58,92,0.85)',
              color: '#F7941D',
              fontFamily: '"Courier New", monospace',
              letterSpacing: '0.04em',
            }}
          >
            {visibleLabel}
          </span>
        </div>
      </div>

      {/* Mobile: small, bottom-left above input */}
      <div className="md:hidden fixed bottom-20 left-3 z-30">
        <div style={{ transition: 'opacity 0.18s ease', opacity }}>
          <div key={animKey} style={{ animation: `mascot-${anim} 2s ease-in-out infinite` }}>
            <img
              src={visibleSrc}
              alt="Windmar Assistant"
              className="w-12 h-12 object-contain drop-shadow-lg"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes mascot-wave {
          0%, 100% { transform: rotate(-4deg) translateY(0px); }
          25%       { transform: rotate(4deg)  translateY(-3px); }
          50%       { transform: rotate(-2deg) translateY(-5px); }
          75%       { transform: rotate(3deg)  translateY(-2px); }
        }
        @keyframes mascot-pulse {
          0%, 100% { transform: scale(1)    translateY(0);   opacity: 1;    }
          50%       { transform: scale(1.07) translateY(-4px); opacity: 0.85; }
        }
        @keyframes mascot-bounce {
          0%, 100% { transform: translateY(0px)  scale(1);    }
          30%       { transform: translateY(-9px) scale(1.05); }
          60%       { transform: translateY(-4px) scale(1.02); }
        }
        @keyframes mascot-heartbeat {
          0%, 100% { transform: scale(1);    }
          15%       { transform: scale(1.13); }
          30%       { transform: scale(1);    }
          45%       { transform: scale(1.08); }
          60%       { transform: scale(1);    }
        }
      `}</style>
    </>
  );
}
