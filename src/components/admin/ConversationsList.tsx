'use client';

import { useMemo, useState } from 'react';

interface ConvRow {
  conv_id: string;
  user_email: string;
  display_name: string | null;
  departamento: string | null;
  rol: string | null;
  title: string;
  total_messages: number;
  first_user_message: string | null;
  last_message_at: string;
  created_at: string;
}

interface MsgRow {
  message_id: string;
  role: 'user' | 'assistant' | string;
  content: string;
  created_at: string;
}

interface Props {
  data: ConvRow[];
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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-PR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Tabla de conversaciones recientes + modal con detalle al hacer click.
 * Permite al admin auditar las interacciones reales asesor↔bot.
 */
export function ConversationsList({ data }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedConv, setSelectedConv] = useState<ConvRow | null>(null);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Estado de la tabla: colapsada (oculta el contenido) y filtro de búsqueda
  const [collapsed, setCollapsed] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Filtrado en memoria — sub-segundo para 30 filas, no necesita debounce
  const filteredData = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) => {
      const name = (row.display_name || '').toLowerCase();
      const email = row.user_email.toLowerCase();
      const title = (row.title || '').toLowerCase();
      const dept = (row.departamento || '').toLowerCase();
      return name.includes(q) || email.includes(q) || title.includes(q) || dept.includes(q);
    });
  }, [data, searchText]);

  async function openConversation(conv: ConvRow) {
    setSelectedId(conv.conv_id);
    setSelectedConv(conv);
    setLoading(true);
    setMessages([]);
    try {
      const res = await fetch(`/api/admin/conversation/${conv.conv_id}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        setMessages(json.messages ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    setSelectedId(null);
    setSelectedConv(null);
    setMessages([]);
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {/* Header con toggle de colapso + buscador */}
        <div className="border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="w-full p-5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
            aria-expanded={!collapsed}
          >
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  💬 Conversaciones recientes
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums">
                  {searchText ? `${filteredData.length} de ${data.length}` : data.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {collapsed
                  ? 'Click para mostrar las conversaciones'
                  : 'Click para ver mensajes de cada una'}
              </p>
            </div>
            {/* Chevron animado: rotación según estado */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-slate-400 transition-transform duration-200 ${collapsed ? 'rotate-0' : 'rotate-180'}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Buscador — solo visible si NO está colapsado */}
          {!collapsed && (
            <div className="px-5 pb-4">
              <div className="relative">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Buscar por nombre, email, departamento o título..."
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-9 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#F7941D] focus:bg-white dark:focus:bg-slate-800 transition-colors"
                />
                {searchText && (
                  <button
                    onClick={() => setSearchText('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    aria-label="Limpiar búsqueda"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tabla — solo se renderiza si NO está colapsado */}
        {!collapsed && (
          <>
            {filteredData.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-400">
                  {searchText
                    ? `Sin resultados para "${searchText}"`
                    : 'Sin conversaciones aún'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 sticky top-0 z-10">
                    <tr>
                      <th className="text-left px-5 py-3 font-medium">Asesor</th>
                      <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Conversación</th>
                      <th className="text-right px-5 py-3 font-medium">Msgs</th>
                      <th className="text-right px-5 py-3 font-medium">Última</th>
                      <th className="text-right px-5 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((row) => (
                      <tr
                        key={row.conv_id}
                        className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-800 dark:text-slate-100">
                            {row.display_name || row.user_email.split('@')[0]}
                          </p>
                          <p className="text-xs text-slate-400">
                            {row.departamento || '—'}
                            {row.rol && ` · ${row.rol}`}
                          </p>
                        </td>
                        <td className="px-5 py-3 hidden md:table-cell max-w-md">
                          <p className="text-slate-700 dark:text-slate-200 truncate">
                            {row.title || 'Sin título'}
                          </p>
                          {row.first_user_message && (
                            <p className="text-xs text-slate-400 truncate italic">
                              &ldquo;{row.first_user_message}&rdquo;
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums font-semibold text-[#1B3A5C] dark:text-blue-300">
                          {row.total_messages}
                        </td>
                        <td className="px-5 py-3 text-right text-xs text-slate-500 tabular-nums whitespace-nowrap">
                          {formatRelative(row.last_message_at)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => openConversation(row)}
                            className="text-xs px-3 py-1 border border-[#F7941D]/40 text-[#F7941D] rounded hover:bg-[#F7941D]/10 transition-colors cursor-pointer"
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de detalle de conversación */}
      {selectedId && selectedConv && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50 dark:bg-slate-800/50">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-[#1B3A5C] dark:text-white truncate">
                  {selectedConv.title || 'Sin título'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  <strong>{selectedConv.display_name || selectedConv.user_email.split('@')[0]}</strong>
                  {' · '}
                  {selectedConv.user_email}
                  {' · '}
                  {selectedConv.departamento || '—'}
                  {selectedConv.rol && ` · ${selectedConv.rol}`}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Iniciada {formatRelative(selectedConv.created_at)} · {selectedConv.total_messages} mensajes
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer flex-shrink-0"
                aria-label="Cerrar"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Body con mensajes */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
                  Cargando mensajes...
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">
                  Sin mensajes
                </p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.message_id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-[#1B3A5C] text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      <p className="text-xs opacity-70 mb-1 flex items-center gap-2">
                        {msg.role === 'user' ? '👤 Asesor' : '🤖 Bot'}
                        <span>·</span>
                        <span className="tabular-nums">{formatTime(msg.created_at)}</span>
                      </p>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer del modal */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-right">
              <button
                onClick={closeModal}
                className="text-xs px-4 py-1.5 bg-[#1B3A5C] text-white rounded hover:bg-[#2a5a8c] transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
