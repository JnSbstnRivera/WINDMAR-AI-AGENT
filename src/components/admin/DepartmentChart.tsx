'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { useAdminThemeColors } from '@/hooks/useAdminThemeColors';

interface Props {
  data: Array<{
    departamento: string;
    total_messages: number;
    active_users: number;
  }>;
}

// Paleta neon executive — violet/cyan/green/amber/rose
const COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e'];

/**
 * Bar chart de mensajes por departamento.
 * Muestra qué área usa más el bot — útil para presentar a dirección.
 */
export function DepartmentChart({ data }: Props) {
  const c = useAdminThemeColors();
  return (
    <div className="ad-card" style={{ padding: 22 }}>
      <div className="ad-ph">
        <span className="ad-pt">Uso por departamento</span>
        <span className="ad-pb">ÁREAS</span>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[240px]">
          <p className="text-sm" style={{ color: 'var(--text3)' }}>Sin datos en este periodo</p>
        </div>
      ) : (
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
              <XAxis dataKey="departamento" stroke={c.axis} fontSize={10} tickLine={false} axisLine={false} />
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
                cursor={{ fill: c.grid }}
                formatter={(value, name) => {
                  if (name === 'total_messages') return [`${value} mensajes`, 'Mensajes'];
                  if (name === 'active_users') return [`${value} asesores`, 'Asesores activos'];
                  return [value, name];
                }}
              />
              <Bar dataKey="total_messages" radius={[6, 6, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} style={{ filter: `drop-shadow(0 0 8px ${COLORS[i % COLORS.length]})` }} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {data.map((d, i) => (
            <div key={d.departamento} className="flex items-center gap-2 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length], boxShadow: `0 0 6px ${COLORS[i % COLORS.length]}` }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium truncate" style={{ color: 'var(--text)' }}>{d.departamento}</p>
                <p className="ad-mono text-[9px] tabular-nums" style={{ color: 'var(--text3)' }}>
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
