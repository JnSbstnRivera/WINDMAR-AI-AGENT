import { ChatInput } from './ChatInput';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  onTypingChange?: (typing: boolean) => void;
}

export function WelcomeScreen({ onSend, disabled, onTypingChange }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
      {/* Logo principal — más grande con halo de fondo */}
      <div className="relative flex items-center justify-center mb-6" style={{ width: 240, height: 240 }}>
        {/* Halo orange */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(247,148,29,0.45) 0%, rgba(247,148,29,0.15) 50%, transparent 75%)',
            filter: 'blur(24px)',
          }}
        />
        {/* Halo blanco brillante */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 60%)',
          }}
        />
        <img
          src="/sunbot.png"
          alt="Windmar AI"
          className="mascot-img relative z-10 w-48 h-48 md:w-56 md:h-56 object-contain drop-shadow-2xl"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      <h1 className="text-3xl md:text-4xl font-bold text-[#1B3A5C] dark:text-white mb-2 text-center">
        Agente IA Windmar Home
      </h1>
      <p className="text-gray-400 dark:text-gray-500 text-sm md:text-base text-center max-w-sm mb-10">
        Tu asistente experto en energía solar, roofing, agua y baterías
      </p>

      <div className="w-full max-w-2xl">
        <ChatInput onSend={onSend} disabled={disabled} onTypingChange={onTypingChange} />
      </div>
    </div>
  );
}
