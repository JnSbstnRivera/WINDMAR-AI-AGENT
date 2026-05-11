interface Props {
  label: string;
  value: string | number | null;
  subtitle?: string;
  /** Color del número grande. Default: navy brand */
  accent?: 'navy' | 'orange' | 'green' | 'red';
  /** Icono SVG inline (opcional) */
  icon?: React.ReactNode;
}

const accentColors = {
  navy:   { text: 'text-[#1B3A5C] dark:text-blue-300', ring: 'ring-blue-200/50 dark:ring-blue-800/50' },
  orange: { text: 'text-[#F7941D] dark:text-orange-300', ring: 'ring-orange-200/50 dark:ring-orange-800/50' },
  green:  { text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200/50 dark:ring-emerald-800/50' },
  red:    { text: 'text-red-600 dark:text-red-400', ring: 'ring-red-200/50 dark:ring-red-800/50' },
};

/**
 * Card de métrica grande. Estilo "ejecutivo" — número grande arriba, label abajo.
 * Sin gradientes ni sombras llamativas — apropiado para presentaciones.
 */
export function MetricCard({ label, value, subtitle, accent = 'navy', icon }: Props) {
  const colors = accentColors[accent];
  const displayValue = value === null || value === undefined ? '—' : value;

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 ring-1 ${colors.ring}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {label}
        </p>
        {icon && <div className={colors.text}>{icon}</div>}
      </div>
      <p className={`text-3xl sm:text-4xl font-bold tabular-nums ${colors.text}`}>
        {displayValue}
      </p>
      {subtitle && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{subtitle}</p>
      )}
    </div>
  );
}
