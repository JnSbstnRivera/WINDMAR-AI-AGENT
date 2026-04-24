interface Props {
  onSend: (text: string) => void;
}

export function WelcomeScreen({ onSend: _ }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <div className="mb-5" style={{ animation: 'welcome-bob 3s ease-in-out infinite' }}>
        <img
          src="/mascot.png"
          alt="Windmar AI"
          className="w-32 h-32 md:w-40 md:h-40 object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
        <style>{`
          @keyframes welcome-bob {
            0%, 100% { transform: translateY(0px);  }
            50%       { transform: translateY(-8px); }
          }
        `}</style>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-[#1B3A5C] mb-2 text-center">
        Agente IA Windmar Home
      </h1>
      <p className="text-gray-400 text-sm md:text-base text-center max-w-sm">
        Tu asistente experto en energía solar, roofing, agua y baterías
      </p>
    </div>
  );
}
