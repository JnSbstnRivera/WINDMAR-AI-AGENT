interface WeekData {
  thisWeekMsgs: number;
  lastWeekMsgs: number;
  msgsChangePct: number | null;
  thisWeekUsers: number;
  lastWeekUsers: number;
  usersChangePct: number | null;
  thisWeekConvs: number;
  lastWeekConvs: number;
  convsChangePct: number | null;
}

interface Props {
  data: WeekData;
}

/**
 * Tarjeta individual de comparación con flecha ↑↓ y % de cambio.
 */
function ComparisonCard({
  label,
  thisValue,
  lastValue,
  changePct,
  icon,
}: {
  label: string;
  thisValue: number;
  lastValue: number;
  changePct: number | null;
  icon: React.ReactNode;
}) {
  const isPositive = changePct !== null && changePct > 0;
  const isNegative = changePct !== null && changePct < 0;
  const isFlat = changePct === 0;
  const noPrev = changePct === null;

  const changeColor = isPositive
    ? 'text-emerald-600 dark:text-emerald-400'
    : isNegative
    ? 'text-red-600 dark:text-red-400'
    : 'text-slate-400';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {label}
        </p>
        <span className="text-slate-400">{icon}</span>
      </div>

      <p className="text-3xl font-bold tabular-nums text-[#1B3A5C] dark:text-blue-300">
        {thisValue}
      </p>

      <div className="mt-3 flex items-center gap-2 text-xs">
        {noPrev ? (
          <span className="text-slate-400">Sin datos de semana anterior</span>
        ) : (
          <>
            <span className={`flex items-center gap-1 font-semibold ${changeColor}`}>
              {isPositive && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              )}
              {isNegative && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              )}
              {isFlat && '—'}
              {Math.abs(changePct!)}%
            </span>
            <span className="text-slate-400">
              vs {lastValue} sem. pasada
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Sección de 3 cards comparativos: mensajes, asesores, conversaciones.
 * Esta semana vs anterior con flechas ↑↓ y % de cambio.
 *
 * Crítico para presentaciones: muestra narrativa de crecimiento/decrecimiento.
 */
export function WeekComparison({ data }: Props) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          📈 Esta semana vs anterior
        </h3>
        <span className="text-xs text-slate-400">(últimos 7 días vs los 7 anteriores)</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ComparisonCard
          label="Mensajes"
          thisValue={data.thisWeekMsgs}
          lastValue={data.lastWeekMsgs}
          changePct={data.msgsChangePct}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          }
        />
        <ComparisonCard
          label="Asesores activos"
          thisValue={data.thisWeekUsers}
          lastValue={data.lastWeekUsers}
          changePct={data.usersChangePct}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
          }
        />
        <ComparisonCard
          label="Conversaciones"
          thisValue={data.thisWeekConvs}
          lastValue={data.lastWeekConvs}
          changePct={data.convsChangePct}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
          }
        />
      </div>
    </div>
  );
}
