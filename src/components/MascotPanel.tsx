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
      {/* Desktop: bottom-left, just after sidebar */}
      <div className="hidden md:flex fixed left-[268px] bottom-16 z-30 flex-col items-center gap-1">
        <div style={{ transition: 'opacity 0.25s ease', opacity }} className="flex flex-col items-center">
          <img
            key={animKey}
            src={visibleSrc}
            alt="Windmar Assistant"
            className="mascot-img w-20 h-20 object-contain drop-shadow-xl"
            style={{ imageRendering: 'pixelated' }}
          />
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

      {/* Mobile: bottom-left above input */}
      <div className="md:hidden fixed bottom-16 left-2 z-30">
        <div style={{ transition: 'opacity 0.25s ease', opacity }}>
          <img
            key={animKey}
            src={visibleSrc}
            alt="Windmar Assistant"
            className="mascot-img w-12 h-12 object-contain drop-shadow-lg"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      </div>
    </>
  );
}
