'use client';

import { BUCKET_LABEL, type Bucket } from '@/lib/zoho-status';
import type { ZohoLeadsCard } from '@/lib/zoho-leads-card';

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
  if (!iso) return 'sin nota';
  const ms = Date.now() - Date.parse(iso);
  if (isNaN(ms)) return '—';
  const h = Math.floor(ms / 3600000);
  if (h < 1) return 'hace <1h';
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
}

/**
 * Tarjeta rica de una LISTA de leads, renderizada desde datos estructurados
 * (no markdown que el modelo deba copiar). Móvil-friendly: filas-tarjeta en vez
 * de una tabla de 7 columnas que se desborda en el teléfono.
 *
 * onLeadClick (opcional): al tocar un lead, manda un mensaje al chat para
 * profundizar (ej. "Busca a Juan Pérez y dime qué pasó").
 */
export function LeadsCard({
  card,
  onLeadClick,
}: {
  card: ZohoLeadsCard;
  onLeadClick?: (text: string) => void;
}) {
  const buckets = Object.entries(card.byBucket ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <div
      className="my-3 w-full max-w-[760px] rounded-xl border-2 px-4 py-3"
      style={{ background: '#0a1628', borderColor: 'rgba(247,148,29,0.4)' }}
    >
      {/* Header */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ color: '#F7941D', fontWeight: 700, fontSize: 14.5 }}>{card.title}</div>
        <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 1 }}>{card.subtitle}</div>
        {buckets.length > 1 && (
          <div className="flex flex-wrap gap-1.5" style={{ marginTop: 8 }}>
            {buckets.map(([b, n]) => (
              <span
                key={b}
                style={{
                  fontSize: 11, padding: '2px 9px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.05)',
                  color: BUCKET_COLOR[b as Bucket] || '#94a3b8',
                  border: `1px solid ${BUCKET_COLOR[b as Bucket] || '#94a3b8'}44`,
                }}
              >
                {BUCKET_LABEL[b as Bucket] || b}: {n}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Filas */}
      <div className="flex flex-col gap-1.5" style={{ maxHeight: 380, overflowY: 'auto' }}>
        {card.rows.map((l, i) => (
          <div
            key={l.id}
            className="rounded-lg px-3 py-2"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <div className="flex items-center gap-2">
              <span style={{ color: '#64748b', fontSize: 11, fontVariantNumeric: 'tabular-nums', minWidth: 18 }}>
                {i + 1}.
              </span>
              <span style={{ color: '#e8eaf0', fontSize: 14, fontWeight: 600 }} className="truncate flex-1">
                {l.fullName}
              </span>
              <span
                style={{ fontSize: 11, color: BUCKET_COLOR[l.bucket], whiteSpace: 'nowrap' }}
                title={`Estado: ${l.status || 'sin estado'}`}
              >
                ● {l.status || 'sin estado'}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: 11, color: '#64748b', marginTop: 3, paddingLeft: 26 }}>
              {l.leadNumber && <span>{l.leadNumber}</span>}
              {l.phone && <span>· 📞 {l.phone}</span>}
              <span style={{ color: l.lastNote ? '#64748b' : '#fca5a5' }}>
                · 📝 {l.lastNote ? timeAgo(l.lastNote.createdAt) : 'sin nota'}
              </span>
            </div>

            {l.lastNote?.preview && (
              <div style={{ fontSize: 11.5, color: '#8da2bd', marginTop: 2, paddingLeft: 26 }} className="truncate">
                “{l.lastNote.preview}”
              </div>
            )}

            <div className="flex items-center gap-3" style={{ marginTop: 5, paddingLeft: 26 }}>
              {onLeadClick && (
                <button
                  onClick={() => onLeadClick(`Busca a ${l.fullName}${l.leadNumber ? ` (${l.leadNumber})` : ''} y dime qué pasó`)}
                  style={{ fontSize: 11.5, color: '#F7941D', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                  title="Abrir ficha + coach"
                >
                  Abrir ↗
                </button>
              )}
              <a
                href={l.zohoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 11.5, color: '#94a3b8' }}
              >
                Zoho ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
