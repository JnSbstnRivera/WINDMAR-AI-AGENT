'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Props {
  data: Array<{ day_label: string; messages_count: number }>;
}

/**
 * Line chart de uso (mensajes/día) últimos 7 días.
 * Cliente component porque Recharts necesita DOM (window/SVG).
 */
export function UsageChart({ data }: Props) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
        📈 Mensajes por día
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Últimos 7 días</p>

      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
            <XAxis
              dataKey="day_label"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
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
            <Line
              type="monotone"
              dataKey="messages_count"
              stroke="#F7941D"
              strokeWidth={2.5}
              dot={{ fill: '#F7941D', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
