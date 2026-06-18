'use client';

import { ChatInput } from './ChatInput';
import { BriefingCard } from './BriefingCard';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  onTypingChange?: (typing: boolean) => void;
  onAttach?: (file: File) => void;
  onEmail?: () => void;
}

export function WelcomeScreen({ onSend, disabled, onTypingChange, onAttach, onEmail }: Props) {
  return (
    <div className="relative flex-1 flex flex-col items-center px-4 pt-2 pb-6 sm:pb-8">
      {/* Sol Windmar estilo "moon chat": fondo negro + esfera azul + borde naranja + estrellas/brasas — detrás del contenido */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="welcome-bg" />
        <div className="welcome-stars">
          <span style={{ left: '8%', top: '12%' }} />
          <span style={{ left: '20%', top: '26%', animationDelay: '1.1s' }} />
          <span style={{ left: '33%', top: '9%', animationDelay: '2.3s' }} />
          <span style={{ left: '47%', top: '18%', animationDelay: '0.6s' }} />
          <span style={{ left: '62%', top: '8%', animationDelay: '1.8s' }} />
          <span style={{ left: '74%', top: '22%', animationDelay: '3.1s' }} />
          <span style={{ left: '88%', top: '14%', animationDelay: '0.9s' }} />
          <span style={{ left: '15%', top: '40%', animationDelay: '2.7s' }} />
          <span style={{ left: '83%', top: '38%', animationDelay: '1.4s' }} />
          <span style={{ left: '54%', top: '31%', animationDelay: '3.6s' }} />
        </div>
        <div className="welcome-aura" />
        <div className="welcome-moon" />
        <div className="welcome-rim" />
        <span className="welcome-ember welcome-ember-1" />
        <span className="welcome-ember welcome-ember-2" />
        <span className="welcome-ember welcome-ember-3" />
        <span className="welcome-ember welcome-ember-4" />
        <span className="welcome-ember welcome-ember-5" />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full flex-1">
      <div className="flex flex-col items-center mt-[5vh] sm:mt-[7vh]">
      <div
        className="relative flex items-center justify-center mb-2 sm:mb-3"
        style={{
          width: 'clamp(160px, 24vw, 220px)',
          height: 'clamp(160px, 24vw, 220px)',
        }}
      >
        <img
          src="/logo-inicial-chat.png"
          alt="Windmar Home"
          className="relative z-10 object-contain welcome-logo"
          style={{
            width: 'clamp(200px, 30vw, 260px)',
            height: 'clamp(200px, 30vw, 260px)',
          }}
        />

        <span className="welcome-particle welcome-particle-1" />
        <span className="welcome-particle welcome-particle-2" />
        <span className="welcome-particle welcome-particle-3" />
        <span className="welcome-particle welcome-particle-4" />
        <span className="welcome-particle welcome-particle-5" />
        <span className="welcome-particle welcome-particle-6" />
      </div>

      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 text-center tracking-tight" style={{ textShadow: '0 1px 16px rgba(43,92,190,0.45)' }}>
        Agente Windmar Home
      </h1>

      <p className="text-gray-300 text-xs sm:text-sm text-center max-w-md mb-1 px-2">
        Tu asistente experto en energía solar, roofing, agua y baterías
      </p>

      <p className="text-[#F7941D] dark:text-[#F7941D] text-sm sm:text-base text-center font-semibold mb-3 sm:mb-4 mt-1">
        ¿En qué vamos a trabajar hoy?
      </p>

      </div>

      <div className="w-full max-w-2xl mt-auto mb-[2vh] sm:mb-[4vh]">
        <BriefingCard onSend={onSend} />
        <ChatInput onSend={onSend} disabled={disabled} onTypingChange={onTypingChange} onAttach={onAttach} onEmail={onEmail} />
      </div>
      </div>

      <style>{`
        /* ── Sol Windmar estilo "moon chat": fondo negro + esfera azul + borde naranja nítido ── */
        .welcome-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(90% 60% at 50% 118%, rgba(29,66,155,0.20) 0%, transparent 60%),
            #04060d;
        }
        .welcome-aura {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translateX(-50%);
          width: min(1200px, 185vw);
          height: 560px;
          background: radial-gradient(50% 70% at 50% 30%,
            rgba(190,216,255,0.24) 0%,
            rgba(43,92,190,0.28) 32%,
            rgba(29,66,155,0.12) 58%,
            transparent 80%);
          filter: blur(46px);
          animation: welcomeAuraPulse 6s ease-in-out infinite;
        }
        /* cuerpo de la esfera: borde superior cálido → azul difuminado → transparente */
        .welcome-moon {
          position: absolute;
          left: 50%;
          top: 53%;
          transform: translateX(-50%);
          width: min(1500px, 220vw);
          height: min(1500px, 220vw);
          border-radius: 50%;
          background: radial-gradient(115% 100% at 50% 0%,
            rgba(255,255,255,0.95) 0%,
            rgba(214,232,255,0.70) 4%,
            rgba(90,150,235,0.55) 14%,
            rgba(43,92,190,0.45) 30%,
            rgba(20,45,110,0.20) 50%,
            transparent 66%);
          animation: welcomeMoonRise 9s ease-in-out infinite;
        }
        /* borde brillante NÍTIDO (la media luna): solo asoma el arco superior */
        .welcome-rim {
          position: absolute;
          left: 50%;
          top: 53%;
          transform: translateX(-50%);
          width: min(1500px, 220vw);
          height: min(1500px, 220vw);
          border-radius: 50%;
          background: transparent;
          box-shadow:
            0 0 3px 1px rgba(255,255,255,0.95),
            0 0 34px 6px rgba(150,190,255,0.50),
            0 0 130px 36px rgba(43,92,190,0.38);
          animation: welcomeRimGlow 4.5s ease-in-out infinite;
        }
        @keyframes welcomeAuraPulse {
          0%, 100% { opacity: 0.8; }
          50%      { opacity: 1; }
        }
        @keyframes welcomeMoonRise {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%      { transform: translateX(-50%) translateY(-10px); }
        }
        @keyframes welcomeRimGlow {
          0%, 100% {
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
        /* campo de estrellas titilando */
        .welcome-stars span {
          position: absolute;
          width: 2px; height: 2px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 0 6px 1px rgba(255,255,255,0.8);
          opacity: 0.4;
          animation: welcomeTwinkle 3.4s ease-in-out infinite;
        }
        @keyframes welcomeTwinkle {
          0%, 100% { opacity: 0.12; transform: scale(0.7); }
          50%      { opacity: 0.95; transform: scale(1.2); }
        }
        /* brasas naranjas que suben desde la esfera */
        .welcome-ember {
          position: absolute;
          bottom: 22%;
          width: 4px; height: 4px;
          border-radius: 50%;
          background: rgb(208,228,255);
          box-shadow: 0 0 9px 2px rgba(130,175,255,0.9);
          opacity: 0;
          animation: welcomeEmber 6s ease-in-out infinite;
        }
        .welcome-ember-1 { left: 31%; animation-delay: 0s; }
        .welcome-ember-2 { left: 44%; animation-delay: 1.4s; width: 3px; height: 3px; }
        .welcome-ember-3 { left: 57%; animation-delay: 2.8s; }
        .welcome-ember-4 { left: 67%; animation-delay: 4.1s; width: 3px; height: 3px; }
        .welcome-ember-5 { left: 38%; animation-delay: 5.2s; }
        @keyframes welcomeEmber {
          0%   { transform: translateY(0) scale(0.6); opacity: 0; }
          15%  { opacity: 0.9; }
          70%  { opacity: 0.5; }
          100% { transform: translateY(-170px) scale(0.2); opacity: 0; }
        }

        @keyframes welcomeLogoGlow {
          0%, 100% {
            filter: drop-shadow(0 0 8px rgba(255,255,255,0.75))
                    drop-shadow(0 0 18px rgba(255,255,255,0.45));
            transform: translateY(0);
          }
          50% {
            filter: drop-shadow(0 0 14px rgba(255,255,255,1))
                    drop-shadow(0 0 28px rgba(255,255,255,0.65));
            transform: translateY(-6px);
          }
        }
        @keyframes welcomeParticleFloat {
          0%   { transform: translate(0, 0) scale(0.4); opacity: 0; }
          15%  { opacity: 0.9; }
          50%  { transform: translate(var(--px, 0), -50px) scale(1); opacity: 0.7; }
          100% { transform: translate(var(--px, 0), -100px) scale(0.3); opacity: 0; }
        }

        .welcome-logo { animation: welcomeLogoGlow 3.4s ease-in-out infinite; }

        .welcome-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgb(253,224,71);
          box-shadow: 0 0 10px rgba(253,224,71,0.95), 0 0 22px rgba(253,224,71,0.6);
          opacity: 0;
          pointer-events: none;
          z-index: 5;
        }
        .welcome-particle-1 {
          left: 18%; bottom: 22%;
          --px: -8px;
          animation: welcomeParticleFloat 3.2s ease-in-out 0s infinite;
        }
        .welcome-particle-2 {
          left: 42%; bottom: 14%;
          --px: 4px;
          animation: welcomeParticleFloat 3.6s ease-in-out 0.6s infinite;
          width: 4px; height: 4px;
        }
        .welcome-particle-3 {
          left: 72%; bottom: 24%;
          --px: 10px;
          animation: welcomeParticleFloat 3.4s ease-in-out 1.1s infinite;
        }
        .welcome-particle-4 {
          left: 28%; bottom: 8%;
          --px: -4px;
          animation: welcomeParticleFloat 4s ease-in-out 1.7s infinite;
          width: 5px; height: 5px;
          background: rgb(27,58,92);
          box-shadow: 0 0 8px rgba(27,58,92,0.85), 0 0 16px rgba(27,58,92,0.5);
        }
        .welcome-particle-5 {
          left: 60%; bottom: 6%;
          --px: 8px;
          animation: welcomeParticleFloat 3.8s ease-in-out 2.2s infinite;
          width: 3px; height: 3px;
        }
        .welcome-particle-6 {
          left: 86%; bottom: 18%;
          --px: 6px;
          animation: welcomeParticleFloat 3.5s ease-in-out 2.8s infinite;
          width: 4px; height: 4px;
        }
      `}</style>
    </div>
  );
}
