import { ChatInput } from './ChatInput';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  onTypingChange?: (typing: boolean) => void;
}

export function WelcomeScreen({ onSend, disabled, onTypingChange }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-6 sm:pb-8">
      {/* Logo Windmar Home — glow solo en silueta + partículas flotantes */}
      <div
        className="relative flex items-center justify-center mb-4 sm:mb-5"
        style={{
          width: 'clamp(180px, 32vw, 240px)',
          height: 'clamp(180px, 32vw, 240px)',
        }}
      >
        {/* Logo principal con glow en silueta (drop-shadow) tipo SUN BOT */}
        <img
          src="/logo-inicial-chat.png"
          alt="Windmar Home"
          className="relative z-10 object-contain welcome-logo"
          style={{
            width: 'clamp(240px, 40vw, 300px)',
            height: 'clamp(240px, 40vw, 300px)',
          }}
        />

        {/* Partículas flotantes hacia arriba (glowmorphism) */}
        <span className="welcome-particle welcome-particle-1" />
        <span className="welcome-particle welcome-particle-2" />
        <span className="welcome-particle welcome-particle-3" />
        <span className="welcome-particle welcome-particle-4" />
        <span className="welcome-particle welcome-particle-5" />
        <span className="welcome-particle welcome-particle-6" />
      </div>

      {/* Título principal */}
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1B3A5C] dark:text-white mb-2 text-center tracking-tight">
        Agente Windmar Home
      </h1>

      {/* Subtítulo */}
      <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm md:text-base text-center max-w-md mb-1 px-2">
        Tu asistente experto en energía solar, roofing, agua y baterías
      </p>

      {/* Pregunta cordial */}
      <p className="text-[#F7941D] dark:text-[#F7941D] text-sm sm:text-base md:text-lg text-center font-semibold mb-6 sm:mb-8 mt-2">
        ¿En qué vamos a trabajar hoy?
      </p>

      {/* Input de chat */}
      <div className="w-full max-w-2xl">
        <ChatInput onSend={onSend} disabled={disabled} onTypingChange={onTypingChange} />
      </div>

      {/* CSS animations: glow silueta + partículas flotantes */}
      <style>{`
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
