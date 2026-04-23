import { QuickActions } from './QuickActions';

interface Props {
  onSend: (text: string) => void;
}

export function WelcomeScreen({ onSend }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 overflow-y-auto">
      <div className="mb-4" style={{ animation: 'welcome-bob 3s ease-in-out infinite' }}>
        <img src="/mascot.png" alt="Windmar AI" className="w-36 h-36 md:w-44 md:h-44 object-contain" style={{ imageRendering: 'pixelated' }} />
        <style>{`
          @keyframes welcome-bob {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-6px); }
          }
        `}</style>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-[#1B3A5C] mb-2 text-center">
        Agente IA Windmar Home
      </h1>
      <p className="text-gray-500 mb-8 text-center text-sm md:text-base">
        Tu asistente experto en productos, precios y ventas
      </p>
      <QuickActions onSelect={onSend} />
    </div>
  );
}
