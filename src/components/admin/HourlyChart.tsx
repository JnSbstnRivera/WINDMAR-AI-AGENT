'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { useAdminThemeColors } from '@/hooks/useAdminThemeColors';

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
  const c = useAdminThemeColors();
  const maxCount = Math.max(...data.map((d) => d.total_messages), 1);
  const peakThreshold = maxCount * 0.6; // top 40% = naranja, resto gris

  // Encontrar hora pico (para mensaje contextual)
  const peakEntry = data.reduce((max, curr) =>
    curr.total_messages > max.total_messages ? curr : max
  );

  return (
    <div className="ad-card" style={{ padding: 22 }}>
      <div className="ad-ph">
        <span className="ad-pt">Uso por hora del día</span>
        {peakEntry.total_messages > 0 ? (
          <span className="ad-pb">PICO · {formatHour(peakEntry.hour_pr).toUpperCase()}</span>
        ) : (
          <span className="ad-pb">24H</span>
        )}
      </div>

      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <BarChart
            data={data.map((d) => ({ ...d, hour_label: formatHour(d.hour_pr) }))}
            margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
            <XAxis
              dataKey="hour_label"
              stroke={c.axis}
              fontSize={9}
              tickLine={false}
              axisLine={false}
              interval={2}
            />
            <YAxis stroke={c.axis} fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: c.tooltipBg,
                border: `1px solid ${c.tooltipBorder}`,
                borderRadius: '8px',
                color: c.tooltipText,
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace',
              }}
              labelStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
              cursor={{ fill: c.grid }}
              formatter={(value) => [`${value} mensajes`, '']}
            />
            <Bar dataKey="total_messages" radius={[4, 4, 0, 0]}>
              {data.map((d) => {
                const isPeak = d.total_messages >= peakThreshold;
                const fill = isPeak ? '#f59e0b' : 'rgba(124, 58, 237, 0.4)';
                return (
                  <Cell
                    key={d.hour_pr}
                    fill={fill}
                    style={isPeak ? { filter: 'drop-shadow(0 0 8px #f59e0b)' } : undefined}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
