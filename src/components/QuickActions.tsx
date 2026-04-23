const QUICK_ACTIONS = [
  '¿Qué le digo a un cliente que paga más de $200 en LUMA?',
  'Compara Lease vs Loan para el cliente',
  '¿Cuánto cuesta un sellado de 2000 sqft?',
  'Cliente pregunta por baterías Anker',
  '¿Qué financiamiento le conviene al cliente?',
  'Beneficios del programa VIP',
];

interface Props {
  onSelect: (text: string) => void;
}

export function QuickActions({ onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
      {QUICK_ACTIONS.map((action, i) => (
        <button
          key={i}
          onClick={() => onSelect(action)}
          className="text-left p-3 md:p-4 rounded-xl border border-gray-200 hover:border-[#F7941D] hover:bg-orange-50 transition-all text-sm text-gray-600 hover:text-[#1B3A5C] cursor-pointer"
        >
          {action}
        </button>
      ))}
    </div>
  );
}
