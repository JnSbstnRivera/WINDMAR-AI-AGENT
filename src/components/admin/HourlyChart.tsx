'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

interface Props {
  data: Array<{
    hour_pr: number;
    total_messages: number;
  }>;
}

function formatHour(h: number): string {
  if (h === 0) return '12am';
  if (h === 12) return '12pm';
  if (h < 12) return `${h}am`;
  return `${h - 12}pm`;
}

/**
 * Bar chart de uso por hora del día (0-23) en hora local Puerto Rico.
 * Identifica picos de actividad → útil para planning de staffing /
 * cuándo lanzar comunicaciones masivas.
 *
 * Las horas pico se destacan en naranja brand; las demás en gris.
 */
export function HourlyChart({ data }: Props) {
  const maxCount = Math.max(...data.map((d) => d.total_messages), 1);
  const peakThreshold = maxCount * 0.6; // top 40% = naranja, resto gris

  // Encontrar hora pico (para mensaje contextual)
  const peakEntry = data.reduce((max, curr) =>
    curr.total_messages > max.total_messages ? curr : max
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          🕐 Uso por hora del día
        </h3>
        {peakEntry.total_messages > 0 && (
          <span className="text-xs text-slate-500">
            Pico: <strong className="text-[#F7941D]">{formatHour(peakEntry.hour_pr)}</strong>
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Hora local Puerto Rico · todo el periodo disponible
      </p>

      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <BarChart
            data={data.map((d) => ({ ...d, hour_label: formatHour(d.hour_pr) }))}
            margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
            <XAxis
              dataKey="hour_label"
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval={2} // mostrar cada 3 horas para evitar overlap
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f1c2e',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#F7941D', fontWeight: 'bold' }}
              formatter={(value) => [`${value} mensajes`, '']}
            />
            <Bar dataKey="total_messages" radius={[4, 4, 0, 0]}>
              {data.map((d) => (
                <Cell
                  key={d.hour_pr}
                  fill={d.total_messages >= peakThreshold ? '#F7941D' : '#94a3b8'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
