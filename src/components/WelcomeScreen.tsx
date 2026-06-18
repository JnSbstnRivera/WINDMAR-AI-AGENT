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
    <div className="relative flex-1 flex flex-col items-center justify-start px-4 pt-[3vh] sm:pt-[5vh] pb-6 sm:pb-8">
      {/* Resplandor "amanecer Windmar" (estilo moon-chat, paleta brand) — detrás del contenido */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="welcome-aura" />
        <div className="welcome-moon" />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full">
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

      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1B3A5C] dark:text-white mb-1 text-center tracking-tight">
        Agente Windmar Home
      </h1>

      <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm text-center max-w-md mb-1 px-2">
        Tu asistente experto en energía solar, roofing, agua y baterías
      </p>

      <p className="text-[#F7941D] dark:text-[#F7941D] text-sm sm:text-base text-center font-semibold mb-3 sm:mb-4 mt-1">
        ¿En qué vamos a trabajar hoy?
      </p>

      <div className="w-full max-w-2xl">
        <BriefingCard onSend={onSend} />
        <ChatInput onSend={onSend} disabled={disabled} onTypingChange={onTypingChange} onAttach={onAttach} onEmail={onEmail} />
      </div>
      </div>

      <style>{`
        /* ── Resplandor "amanecer Windmar" (paleta brand) ── */
        .welcome-moon {
          position: absolute;
          left: 50%;
          bottom: clamp(-340px, -36%, -160px);
          transform: translateX(-50%);
          width: min(1000px, 175vw);
          height: min(1000px, 175vw);
          border-radius: 50%;
          background: radial-gradient(120% 92% at 50% 0%,
            rgba(247,148,29,0.85) 0%,
            rgba(247,148,29,0.34) 9%,
            rgba(29,66,155,0.45) 23%,
            rgba(27,58,92,0.30) 43%,
            rgba(27,58,92,0) 66%);
          filter: blur(2px);
        }
        .welcome-aura {
          position: absolute;
          left: 50%;
          bottom: -8%;
          transform: translateX(-50%);
          width: min(920px, 150vw);
          height: 440px;
          background: radial-gradient(52% 82% at 50% 100%,
            rgba(247,148,29,0.22) 0%,
            rgba(29,66,155,0.16) 46%,
            transparent 76%);
          filter: blur(34px);
          animation: welcomeAuraPulse 6s ease-in-out infinite;
        }
        @keyframes welcomeAuraPulse {
          0%, 100% { opacity: 0.75; }
          50%      { opacity: 1; }
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
