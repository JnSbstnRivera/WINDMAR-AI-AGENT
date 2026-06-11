'use client';

import { BUCKET_LABEL, type Bucket } from '@/lib/zoho-status';

// Tipos client-safe (espejo de los del servidor; NO importamos de zoho.ts
// para no arrastrar código de servidor al bundle del cliente).
export interface PanelLead {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: string | null;
  bucket: Bucket;
  modifiedAt: string | null;
  createdAt: string | null;
  zohoUrl: string;
  lastNote?: { content: string; createdAt: string | null } | null;
  needsFollowUp?: boolean;
}

export interface MyLeadsData {
  ownerEmail: string;
  total: number;
  byBucket: Record<string, number>;
  leads: PanelLead[];
  triage?: {
    actionableTotal: number;
    checked: number;
    capped: boolean;
    staleHours: number;
    needFollowUp: PanelLead[];
  };
}

const BUCKET_COLOR: Record<Bucket, string> = {
  nuevo: '#38bdf8',
  seguimiento: '#F7941D',
  frio: '#94a3b8',
  cita_pendiente: '#a78bfa',
  cita_realizada: '#22c55e',
  vendido: '#10b981',
  descartado: '#64748b',
  sin_estado: '#64748b',
};

function timeAgo(iso: string | null): string {
  if (!iso) return 'nunca';
  const ms = Date.now() - Date.parse(iso);
  if (isNaN(ms)) return '—';
  const h = Math.floor(ms / 3600000);
  if (h < 1) return 'hace <1h';
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
}

export function MyLeadsPanel({
  data,
  mode,
  onClose,
  onOpenLead,
}: {
  data: MyLeadsData;
  mode: 'list' | 'triage';
  onClose: () => void;
  onOpenLead: (query: string) => void;
}) {
  const triage = mode === 'triage' && data.triage;
  const rows: PanelLead[] = triage ? data.triage!.needFollowUp : data.leads;

  return (
    <div
      className="mx-auto my-3 max-w-[860px] w-full rounded-xl border-2 px-4 py-4"
      style={{ background: '#0a1628', borderColor: 'rgba(247,148,29,0.4)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div style={{ color: '#F7941D', fontWeight: 700, fontSize: 15 }}>
            {triage ? 'Leads que necesitan seguimiento' : 'Mi cartera'}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>
            {triage
              ? `${data.triage!.needFollowUp.length} sin nota en ${data.triage!.staleHours}h · revisados ${data.triage!.checked} de ${data.triage!.actionableTotal} accionables`
              : `${data.total} leads · ${data.ownerEmail}`}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1.5 rounded-md hover:bg-white/10 cursor-pointer"
          aria-label="Cerrar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Chips por bucket (solo en modo lista) */}
      {!triage && (
        <div className="flex flex-wrap gap-2 mb-3">
          {Object.entries(data.byBucket)
            .sort((a, b) => b[1] - a[1])
            .map(([b, n]) => (
              <span
                key={b}
                style={{
                  fontSize: 12, padding: '3px 10px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)',
                  color: BUCKET_COLOR[b as Bucket] || '#94a3b8',
                  border: `1px solid ${BUCKET_COLOR[b as Bucket] || '#94a3b8'}55`,
                }}
              >
                {BUCKET_LABEL[b as Bucket] || b}: {n}
              </span>
            ))}
        </div>
      )}

      {/* Lista */}
      {rows.length === 0 ? (
        <div style={{ color: '#94a3b8', fontSize: 13, padding: '12px 0' }}>
          {triage ? '¡Todo al día! Ningún lead accionable sin nota reciente. 🎉' : 'No hay leads en tu cartera.'}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5" style={{ maxHeight: 360, overflowY: 'auto' }}>
          {rows.map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <div className="flex-1 min-w-0">
                <div style={{ color: '#e8eaf0', fontSize: 14, fontWeight: 500 }} className="truncate">
                  {l.fullName}
                </div>
                <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: 11, marginTop: 2 }}>
                  <span style={{ color: BUCKET_COLOR[l.bucket] }}>
                    ● {l.status || 'sin estado'}
                  </span>
                  {triage && (
                    <span style={{ color: '#fca5a5' }}>
                      · última nota {timeAgo(l.lastNote?.createdAt ?? null)}
                    </span>
                  )}
                  {l.phone && <span style={{ color: '#64748b' }}>· {l.phone}</span>}
                </div>
              </div>
              <button
                onClick={() => onOpenLead(l.email || l.phone || l.fullName)}
                className="text-xs px-2.5 py-1 rounded-md cursor-pointer flex-shrink-0"
                style={{ border: '1px solid rgba(247,148,29,0.5)', color: '#F7941D' }}
                title="Abrir ficha + coach IA"
              >
                Abrir
              </button>
              <a
                href={l.zohoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-2 py-1 rounded-md cursor-pointer flex-shrink-0 hover:bg-white/10"
                style={{ color: '#94a3b8' }}
                title="Ver en Zoho"
              >
                Zoho ↗
              </a>
            </div>
          ))}
        </div>
      )}

      {triage && data.triage!.capped && (
        <div style={{ color: '#64748b', fontSize: 11, marginTop: 8 }}>
          * Revisé los primeros {data.triage!.checked} leads accionables. Tienes más; ajusta el filtro si necesitas el resto.
        </div>
      )}
    </div>
  );
}
