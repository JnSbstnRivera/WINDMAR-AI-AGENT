'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useAdminThemeColors } from '@/hooks/useAdminThemeColors';

interface Props {
  thumbsUp: number;
  thumbsDown: number;
}

/**
 * Donut chart de calidad: 👍 vs 👎.
 * Si no hay feedback aún, muestra empty state.
 */
export function QualityDonut({ thumbsUp, thumbsDown }: Props) {
  const c = useAdminThemeColors();
  const total = thumbsUp + thumbsDown;
  const pct = total > 0 ? Math.round((thumbsUp / total) * 100) : null;

  return (
    <div className="ad-card" style={{ padding: 22 }}>
      <div className="ad-ph">
        <span className="ad-pt">Calidad de respuestas</span>
        <span className="ad-pb">👍 / 👎</span>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center h-[220px] text-center">
          <span className="text-4xl mb-2">📭</span>
          <p className="text-sm" style={{ color: 'var(--text2)' }}>Sin feedback aún</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text3)' }}>
            Los asesores pueden calificar 👍/👎
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <div style={{ width: 140, height: 140, position: 'relative' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Útil', value: thumbsUp },
                    { name: 'No útil', value: thumbsDown },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#10b981" style={{ filter: 'drop-shadow(0 0 6px #10b981)' }} />
                  <Cell fill="#f43f5e" style={{ filter: 'drop-shadow(0 0 6px #f43f5e)' }} />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: c.tooltipBg,
                    border: `1px solid ${c.tooltipBorder}`,
                    borderRadius: '8px',
                    color: c.tooltipText,
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="ad-display" style={{ fontSize: 30, lineHeight: 1, color: 'var(--text)' }}>{pct}%</span>
              <span className="ad-mono" style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>útil</span>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
              <span className="text-sm" style={{ color: 'var(--text2)' }}>
                <strong style={{ color: 'var(--text)' }}>{thumbsUp}</strong> útiles
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#f43f5e', boxShadow: '0 0 6px #f43f5e' }} />
              <span className="text-sm" style={{ color: 'var(--text2)' }}>
                <strong style={{ color: 'var(--text)' }}>{thumbsDown}</strong> no útiles
              </span>
            </div>
            <div className="pt-2 border-t" style={{ borderColor: 'var(--glass-border)' }}>
              <p className="ad-mono" style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.1em' }}>
                TOTAL · <strong style={{ color: 'var(--text)' }}>{total}</strong> votos
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
