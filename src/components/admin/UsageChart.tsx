'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAdminThemeColors } from '@/hooks/useAdminThemeColors';

interface Props {
  data: Array<{ day_label: string; messages_count: number }>;
}

/**
 * Line chart de uso (mensajes/día) últimos 7 días.
 * Cliente component porque Recharts necesita DOM (window/SVG).
 */
export function UsageChart({ data }: Props) {
  const c = useAdminThemeColors();
  return (
    <div className="ad-card" style={{ padding: 22 }}>
      <div className="ad-ph">
        <span className="ad-pt">Mensajes por día</span>
        <span className="ad-pb">7 DÍAS</span>
      </div>

      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="usageGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
            <XAxis dataKey="day_label" stroke={c.axis} fontSize={10} tickLine={false} axisLine={false} />
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
              labelStyle={{ color: '#7c3aed', fontWeight: 'bold' }}
              formatter={(value) => [`${value} mensajes`, '']}
            />
            <Line
              type="monotone"
              dataKey="messages_count"
              stroke="url(#usageGrad)"
              strokeWidth={2.5}
              dot={{ fill: '#7c3aed', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#a78bfa' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
