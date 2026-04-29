import { ChatInput } from './ChatInput';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  onTypingChange?: (typing: boolean) => void;
}

export function WelcomeScreen({ onSend, disabled, onTypingChange }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-6 sm:pb-8">
      {/* Logo — más compacto y responsive */}
      <div
        className="relative flex items-center justify-center mb-4 sm:mb-5"
        style={{
          width: 'clamp(140px, 28vw, 200px)',
          height: 'clamp(140px, 28vw, 200px)',
        }}
      >
        {/* Halo orange */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(247,148,29,0.45) 0%, rgba(247,148,29,0.15) 50%, transparent 75%)',
            filter: 'blur(20px)',
          }}
        />
        {/* Halo blanco brillante */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(255,255,255,0.28) 0%, transparent 60%)',
          }}
        />
        <img
          src="/sunbot-feliz.png"
          alt="Windmar AI"
          className="mascot-img relative z-10 object-contain drop-shadow-2xl"
          style={{
            imageRendering: 'pixelated',
            width: 'clamp(110px, 22vw, 170px)',
            height: 'clamp(110px, 22vw, 170px)',
          }}
        />
      </div>

      {/* Título principal — Agente Windmar Home (sin IA) */}
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
    </div>
  );
}
