'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

interface Props {
  data: Array<{
    departamento: string;
    total_messages: number;
    active_users: number;
  }>;
}

// Paleta brand: navy → naranja, dependiendo del orden de uso
const COLORS = ['#1B3A5C', '#F7941D', '#2a5a8c', '#e8830d', '#94a3b8'];

/**
 * Bar chart de mensajes por departamento.
 * Muestra qué área usa más el bot — útil para presentar a dirección.
 */
export function DepartmentChart({ data }: Props) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
        🏢 Uso por departamento
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Mensajes y asesores activos por área
      </p>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[240px]">
          <p className="text-sm text-slate-400">Sin datos en este periodo</p>
        </div>
      ) : (
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
              <XAxis
                dataKey="departamento"
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
                formatter={(value, name) => {
                  if (name === 'total_messages') return [`${value} mensajes`, 'Mensajes'];
                  if (name === 'active_users') return [`${value} asesores`, 'Asesores activos'];
                  return [value, name];
                }}
              />
              <Bar dataKey="total_messages" radius={[6, 6, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Mini-leyenda con números exactos */}
      {data.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {data.map((d, i) => (
            <div key={d.departamento} className="flex items-center gap-2 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-700 dark:text-slate-200 truncate">{d.departamento}</p>
                <p className="text-slate-400 tabular-nums">
                  {d.total_messages} · {d.active_users} asesores
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
