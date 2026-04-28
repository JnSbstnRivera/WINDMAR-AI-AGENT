import { useEffect, useState } from 'react';

interface Props {
  onDone: () => void;
}

export function SplashScreen({ onDone }: Props) {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 100);
    const t2 = setTimeout(() => setPhase('exit'), 2600);
    const t3 = setTimeout(() => onDone(), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      style={{
        transition: 'opacity 0.6s ease',
        opacity: phase === 'exit' ? 0 : 1,
      }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0d1f35]"
    >
      {/* Animated background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          style={{
            animation: 'pulse-glow 2s ease-in-out infinite',
            background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(247,148,29,0.15) 0%, transparent 70%)',
          }}
          className="absolute inset-0"
        />
        {/* Floating pixels */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            style={{
              width: i % 3 === 0 ? '6px' : '4px',
              height: i % 3 === 0 ? '6px' : '4px',
              left: `${8 + i * 7.5}%`,
              top: `${15 + (i % 5) * 15}%`,
              background: i % 2 === 0 ? '#F7941D' : '#1B3A5C',
              animation: `float-pixel ${1.5 + (i % 3) * 0.5}s ease-in-out ${i * 0.15}s infinite alternate`,
              imageRendering: 'pixelated',
            }}
            className="absolute rounded-none"
          />
        ))}
      </div>

      {/* Mascot */}
      <div
        style={{
          transition: 'transform 0.7s cubic-bezier(0.34,1.56,0.64,1), opacity 0.5s ease',
          transform: phase === 'enter' ? 'scale(0.4) translateY(30px)' : 'scale(1) translateY(0)',
          opacity: phase === 'enter' ? 0 : 1,
          animation: phase === 'visible' ? 'bob 2s ease-in-out infinite' : undefined,
        }}
        className="relative mb-6"
      >
        <img
          src="/sunbot.png"
          alt="Windmar AI"
          className="w-40 h-40 md:w-48 md:h-48 object-contain drop-shadow-2xl"
          style={{ imageRendering: 'pixelated' }}
        />
        {/* Thumbs up flash */}
        <div
          style={{
            animation: phase === 'visible' ? 'ping-once 0.6s ease-out 0.8s both' : undefined,
          }}
          className="absolute -right-2 -top-2 w-7 h-7 bg-[#F7941D] rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg"
        >
          ✦
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          transition: 'opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s',
          opacity: phase === 'enter' ? 0 : 1,
          transform: phase === 'enter' ? 'translateY(16px)' : 'translateY(0)',
        }}
        className="text-center mb-2"
      >
        <h1
          className="text-2xl md:text-3xl font-black tracking-wider uppercase text-center"
          style={{
            color: '#F7941D',
            textShadow: '0 0 20px rgba(247,148,29,0.6), 0 0 40px rgba(247,148,29,0.3)',
            fontFamily: '"Courier New", monospace',
          }}
        >
          Windmar Home
        </h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="h-px w-6 bg-[#F7941D] opacity-50" />
          <span
            className="text-xs font-bold tracking-[0.2em] uppercase text-center"
            style={{ color: '#7eb8f7', fontFamily: '"Courier New", monospace' }}
          >
            Iniciando Asistente Virtual
          </span>
          <div className="h-px w-6 bg-[#F7941D] opacity-50" />
        </div>
      </div>

      {/* Subtitle */}
      <p
        style={{
          transition: 'opacity 0.6s ease 0.5s',
          opacity: phase === 'enter' ? 0 : 0.6,
          fontFamily: '"Courier New", monospace',
        }}
        className="text-xs text-gray-400 tracking-widest uppercase mb-8 text-center px-4"
      >
        Agente Experto · Energía Solar · Puerto Rico
      </p>

      {/* Loading dots */}
      <div
        style={{
          transition: 'opacity 0.4s ease 0.7s',
          opacity: phase === 'enter' ? 0 : 1,
        }}
        className="flex gap-2"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              animation: `dot-bounce 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
              background: '#F7941D',
              width: '8px',
              height: '8px',
              imageRendering: 'pixelated',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes bob {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-8px) scale(1.02); }
        }
        @keyframes dot-bounce {
          from { transform: translateY(0); opacity: 0.4; }
          to   { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes float-pixel {
          from { transform: translateY(0) rotate(0deg); opacity: 0.3; }
          to   { transform: translateY(-12px) rotate(45deg); opacity: 0.8; }
        }
        @keyframes ping-once {
          0%   { transform: scale(0); opacity: 1; }
          80%  { transform: scale(1.4); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
