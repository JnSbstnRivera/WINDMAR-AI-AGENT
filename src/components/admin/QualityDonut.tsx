'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Props {
  thumbsUp: number;
  thumbsDown: number;
}

/**
 * Donut chart de calidad: 👍 vs 👎.
 * Si no hay feedback aún, muestra empty state.
 */
export function QualityDonut({ thumbsUp, thumbsDown }: Props) {
  const total = thumbsUp + thumbsDown;
  const pct = total > 0 ? Math.round((thumbsUp / total) * 100) : null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
        🎯 Calidad de respuestas
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Feedback de asesores
      </p>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center h-[220px] text-center">
          <span className="text-4xl mb-2">📭</span>
          <p className="text-sm text-slate-400">Sin feedback aún</p>
          <p className="text-xs text-slate-400 mt-1">
            Los asesores pueden calificar 👍/👎 cada respuesta
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <div style={{ width: 140, height: 140, position: 'relative' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Útil', value: thumbsUp, color: '#22c55e' },
                    { name: 'No útil', value: thumbsDown, color: '#ef4444' },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f1c2e',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Número central */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{pct}%</span>
              <span className="text-[10px] text-slate-500">útil</span>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500"></span>
              <span className="text-sm text-slate-700 dark:text-slate-300">
                <strong>{thumbsUp}</strong> útiles
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-red-500"></span>
              <span className="text-sm text-slate-700 dark:text-slate-300">
                <strong>{thumbsDown}</strong> no útiles
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500">Total: <strong>{total}</strong> votos</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
