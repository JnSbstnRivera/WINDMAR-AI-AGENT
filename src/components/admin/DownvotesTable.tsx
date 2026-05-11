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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      <div className="p-5 border-b border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          ⚠️ Downvotes a revisar
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Respuestas marcadas como no útiles — útiles para mejorar el prompt
        </p>
      </div>

      {data.length === 0 ? (
        <div className="p-8 text-center">
          <span className="text-3xl mb-2 block">🎉</span>
          <p className="text-sm text-slate-500">Sin downvotes — el bot está respondiendo bien</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[400px] overflow-y-auto">
          {data.map((row) => (
            <div key={row.feedback_id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {row.display_name || row.user_email.split('@')[0]}
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-400">{formatRelative(row.created_at)}</span>
                </div>
                <span className="text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">
                  👎
                </span>
              </div>

              {row.reason && (
                <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/10 border-l-2 border-red-300 dark:border-red-700 rounded">
                  <p className="text-xs text-red-800 dark:text-red-200 italic">
                    &ldquo;{row.reason}&rdquo;
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                <strong className="text-slate-700 dark:text-slate-300">Respuesta del bot:</strong> {row.message_excerpt}
                {row.message_excerpt.length >= 200 && '...'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
