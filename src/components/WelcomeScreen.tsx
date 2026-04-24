import { ChatInput } from './ChatInput';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  onTypingChange?: (typing: boolean) => void;
}

export function WelcomeScreen({ onSend, disabled, onTypingChange }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
      <img
        src="/mascot.png"
        alt="Windmar AI"
        className="mascot-img w-28 h-28 md:w-36 md:h-36 object-contain mb-4"
        style={{ imageRendering: 'pixelated' }}
      />
      <h1 className="text-2xl md:text-3xl font-bold text-[#1B3A5C] dark:text-white mb-1 text-center">
        Agente IA Windmar Home
      </h1>
      <p className="text-gray-400 dark:text-gray-500 text-sm md:text-base text-center max-w-sm mb-8">
        Tu asistente experto en energía solar, roofing, agua y baterías
      </p>
      <div className="w-full max-w-2xl">
        <ChatInput onSend={onSend} disabled={disabled} onTypingChange={onTypingChange} />
      </div>
    </div>
  );
}
