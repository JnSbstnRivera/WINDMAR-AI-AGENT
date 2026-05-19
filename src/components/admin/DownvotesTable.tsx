interface DownvoteRow {
  feedback_id: string;
  user_email: string;
  display_name: string | null;
  message_excerpt: string;
  reason: string | null;
  created_at: string;
}

interface Props {
  data: DownvoteRow[];
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'recién';
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.round(diffH / 24);
  return `hace ${diffD}d`;
}

/**
 * Tabla de downvotes recientes — input crítico para mejorar el SYSTEM_PROMPT.
 * Muestra extracto del mensaje + razón del asesor (si la dio).
 */
export function DownvotesTable({ data }: Props) {
  return (
    <div className="ad-card" style={{ padding: 22 }}>
      <div className="ad-ph">
        <span className="ad-pt">Downvotes a revisar</span>
        <span className="ad-pb">👎 RECIENTES</span>
      </div>

      {data.length === 0 ? (
        <div className="p-6 text-center">
          <span className="text-3xl mb-2 block">🎉</span>
          <p className="text-sm" style={{ color: 'var(--text2)' }}>Sin downvotes — el bot está respondiendo bien</p>
        </div>
      ) : (
        <div className="max-h-[400px] overflow-y-auto -mr-2 pr-2 flex flex-col">
          {data.map((row) => (
            <div
              key={row.feedback_id}
              className="py-3 px-2 hover:bg-white/[0.03] transition-colors rounded-lg border-b last:border-b-0"
              style={{ borderColor: 'rgba(255,255,255,0.04)' }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                    {row.display_name || row.user_email.split('@')[0]}
                  </span>
                  <span className="ad-mono text-[9px]" style={{ color: 'var(--text3)' }}>
                    · {formatRelative(row.created_at)}
                  </span>
                </div>
                <span
                  className="ad-mono text-[9px] px-2 py-0.5 rounded"
                  style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' }}
                >
                  👎
                </span>
              </div>

              {row.reason && (
                <div
                  className="mb-2 p-2 rounded border-l-2"
                  style={{ background: 'rgba(244,63,94,0.08)', borderColor: '#f43f5e' }}
                >
                  <p className="text-[11px] italic" style={{ color: '#fda4af' }}>
                    &ldquo;{row.reason}&rdquo;
                  </p>
                </div>
              )}

              <p className="text-[11px] leading-relaxed line-clamp-3" style={{ color: 'var(--text2)' }}>
                <strong style={{ color: 'var(--text)' }}>Respuesta:</strong> {row.message_excerpt}
                {row.message_excerpt.length >= 200 && '…'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
