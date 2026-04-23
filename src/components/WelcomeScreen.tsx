import { QuickActions } from './QuickActions';

interface Props {
  onSend: (text: string) => void;
}

export function WelcomeScreen({ onSend }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 overflow-y-auto">
      <div className="mb-4">
        <svg width="60" height="60" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="40" fill="#F7941D" />
          <path
            d="M40 12 L44 27 L60 27 L47 36 L52 51 L40 42 L28 51 L33 36 L20 27 L36 27 Z"
            fill="white"
          />
        </svg>
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
