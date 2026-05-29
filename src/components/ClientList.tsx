'use client';

import type { ZohoLead } from '@/lib/zoho';

interface Props {
  leads: ZohoLead[];
  /** Click en una fila → el padre busca ese lead con getClientFull (por email o teléfono) */
  onSelectLead: (lead: ZohoLead) => void;
  /** Cierra la lista sin elegir */
  onClose: () => void;
}

/**
 * Lista de leads cuando una búsqueda devuelve varios matches.
 * Cada fila es clickeable y abre el ClientCard del lead elegido.
 */
export function ClientList({ leads, onSelectLead, onClose }: Props) {
  return (
    <div
      className="mx-auto my-3 max-w-[860px] w-full rounded-xl border-2 wm-fade-in"
      style={{
        background: 'linear-gradient(180deg, #0a1628 0%, #0f1c2e 100%)',
        borderColor: 'rgba(247,148,29,0.5)',
        boxShadow: '0 0 32px rgba(247,148,29,0.25)',
        color: '#e8edf8',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-orange-500/30">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-[#F7941D] font-bold">
            🔍 Múltiples resultados en Zoho
          </p>
          <p className="text-xs text-gray-300 mt-0.5">
            {leads.length} coincidencia{leads.length !== 1 ? 's' : ''} encontrada{leads.length !== 1 ? 's' : ''} · click en una para ver detalle
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1.5 rounded-md hover:bg-white/10 cursor-pointer"
          aria-label="Cerrar lista"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Lista */}
      <div className="divide-y divide-white/10">
        {leads.map((lead) => {
          const initials = lead.fullName
            .split(/\s+/)
            .map((p) => p[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase();

          return (
            <button
              key={lead.id}
              onClick={() => onSelectLead(lead)}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#F7941D]/10 transition-colors cursor-pointer text-left group"
            >
              {/* Avatar inicial */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(247,148,29,0.3) 0%, rgba(247,148,29,0.15) 100%)',
                  color: '#F7941D',
                  border: '1px solid rgba(247,148,29,0.4)',
                }}
              >
                {initials}
              </div>

              {/* Info principal */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate group-hover:text-[#F7941D] transition-colors">
                  {lead.fullName}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {lead.email && <span>{lead.email}</span>}
                  {lead.email && (lead.mobile || lead.phone) && <span> · </span>}
                  {(lead.mobile || lead.phone) && <span>{lead.mobile || lead.phone}</span>}
                </p>
              </div>

              {/* Lead # + chevron */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {lead.leadNumber && (
                  <span className="text-[10px] text-gray-500 font-mono">
                    {lead.leadNumber}
                  </span>
                )}
                {lead.stage && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      background: 'rgba(247,148,29,0.15)',
                      color: '#F7941D',
                      border: '1px solid rgba(247,148,29,0.3)',
                    }}
                  >
                    {lead.stage}
                  </span>
                )}
                <svg className="w-4 h-4 text-gray-400 group-hover:text-[#F7941D]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
