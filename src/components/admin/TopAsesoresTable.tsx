interface AsesorRow {
  asesor_email: string;
  display_name: string | null;
  departamento: string | null;
  rol: string | null;
  /** Foto de Microsoft 365 como data URI base64 — null si no tiene */
  photo_url?: string | null;
  total_messages: number;
  total_convs: number;
}

interface Props {
  data: AsesorRow[];
}

/**
 * Tabla ranking de asesores más activos.
 * Diseño limpio, sin gradientes — apropiado para presentaciones.
 */
export function TopAsesoresTable({ data }: Props) {
  // Paleta de avatares estilo executive — rota por posición
  const avatarColors = [
    { col: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
    { col: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
    { col: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    { col: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { col: '#f43f5e', bg: 'rgba(244,63,94,0.08)' },
  ];

  return (
    <div className="ad-card" style={{ padding: 22 }}>
      <div className="ad-ph">
        <span className="ad-pt">Top asesores más activos</span>
        <span className="ad-pb">RANKING</span>
      </div>

      {data.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm" style={{ color: 'var(--text3)' }}>Sin datos en este periodo</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {data.map((row, i) => {
            const palette = avatarColors[i % avatarColors.length];
            const initials = (row.display_name || row.asesor_email.split('@')[0])
              .split(/[.\s]/)
              .map(w => w[0]?.toUpperCase() ?? '')
              .slice(0, 2)
              .join('');
            const maxMessages = Math.max(...data.map(d => d.total_messages), 1);
            const fillPct = Math.round((row.total_messages / maxMessages) * 100);

            return (
              <div
                key={row.asesor_email}
                className="ad-agent-row relative overflow-hidden"
                title={`${row.display_name || row.asesor_email}\n${row.total_messages} mensajes · ${row.total_convs} conversaciones`}
              >
                {/* Barra de progreso de fondo — proporcional a mensajes */}
                <div
                  className="absolute inset-y-0 left-0 pointer-events-none transition-all duration-700"
                  style={{
                    width: `${fillPct}%`,
                    background: `linear-gradient(90deg, ${palette.col}14 0%, transparent 100%)`,
                    borderRadius: 10,
                  }}
                />

                <span className="ad-mono text-[9px] w-3 flex-shrink-0 relative z-10" style={{ color: 'var(--text3)' }}>
                  {i + 1}
                </span>
                {/* Avatar: foto Microsoft 365 si existe, sino iniciales con
                    color de paleta. La foto va con object-fit cover + redondeada
                    al mismo radio que las iniciales (10px). */}
                {row.photo_url ? (
                  <img
                    src={row.photo_url}
                    alt={row.display_name || row.asesor_email}
                    className="w-8 h-8 rounded-[10px] object-cover flex-shrink-0 relative z-10 border"
                    style={{
                      borderColor: 'rgba(255,255,255,0.08)',
                      boxShadow: `0 0 8px ${palette.col}33`,
                    }}
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-[10px] flex items-center justify-center font-bold text-[11px] flex-shrink-0 border relative z-10"
                    style={{
                      background: palette.bg,
                      color: palette.col,
                      borderColor: 'rgba(255,255,255,0.08)',
                      boxShadow: `0 0 8px ${palette.col}33`,
                    }}
                  >
                    {initials || '—'}
                  </div>
                )}
                <div className="flex-1 min-w-0 relative z-10">
                  <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)' }}>
                    {row.display_name || row.asesor_email.split('@')[0]}
                  </div>
                  <div className="ad-mono text-[8px] uppercase tracking-[0.1em]" style={{ color: 'var(--text3)' }}>
                    {row.departamento || 'sin depto'}{row.rol ? ` · ${row.rol}` : ''}
                  </div>
                </div>
                <div className="text-right relative z-10">
                  <div className="ad-display text-[22px] leading-none tabular-nums" style={{ color: palette.col }}>
                    {row.total_messages}
                  </div>
                  <div className="ad-mono text-[8px] mt-0.5" style={{ color: 'var(--text3)' }}>
                    {row.total_convs} convs
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
