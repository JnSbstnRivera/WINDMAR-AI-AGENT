'use client';

import { BUCKET_LABEL, type Bucket } from '@/lib/zoho-status';
import type { ZohoLeadsCard } from '@/lib/zoho-leads-card';
import { callHref } from '@/lib/dialer';

const BUCKET_COLOR: Record<Bucket, string> = {
  nuevo: '#38bdf8', seguimiento: '#F7941D', frio: '#94a3b8', cita_pendiente: '#a78bfa',
  cita_realizada: '#22c55e', vendido: '#10b981', descartado: '#64748b', sin_estado: '#64748b',
};

const fmtFecha = (iso: string | null) => (iso ? iso.slice(0, 10) : '—');

const th: React.CSSProperties = {
  textAlign: 'left', padding: '6px 8px', fontSize: 10.5, letterSpacing: '0.04em',
  textTransform: 'uppercase', color: '#F7941D', whiteSpace: 'nowrap',
  borderBottom: '1px solid rgba(247,148,29,0.25)', position: 'sticky', top: 0, background: '#0a1628',
};
const td: React.CSSProperties = { padding: '6px 8px', fontSize: 12.5, color: '#cbd5e1', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' };

/**
 * Lista de leads como TABLA HTML interactiva (filas/columnas), no texto plano.
 * Columnas: Lead# · Cliente · Estado · Owner · Consultor · Tel · Creado · Abrir.
 * En búsquedas por teléfono/correo/nombre, abajo va una tabla de deals.
 * onLeadClick abre la ficha + cuadro de tipificación de ese lead.
 */
export function LeadsCard({
  card,
  onLeadClick,
}: {
  card: ZohoLeadsCard;
  onLeadClick?: (text: string) => void;
}) {
  const buckets = Object.entries(card.byBucket ?? {}).sort((a, b) => b[1] - a[1]);
  const deals = card.deals ?? [];

  return (
    <div
      className="my-3 w-full max-w-[860px] rounded-xl border-2 px-3 py-3"
      style={{ background: '#0a1628', borderColor: 'rgba(247,148,29,0.4)' }}
    >
      {/* Header */}
      <div style={{ padding: '0 4px', marginBottom: 8 }}>
        <div style={{ color: '#F7941D', fontWeight: 700, fontSize: 14.5 }}>{card.title}</div>
        <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 1 }}>{card.subtitle}</div>
        {buckets.length > 1 && (
          <div className="flex flex-wrap gap-1.5" style={{ marginTop: 8 }}>
            {buckets.map(([b, n]) => (
              <span key={b} style={{
                fontSize: 11, padding: '2px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.05)',
                color: BUCKET_COLOR[b as Bucket] || '#94a3b8', border: `1px solid ${BUCKET_COLOR[b as Bucket] || '#94a3b8'}44`,
              }}>{BUCKET_LABEL[b as Bucket] || b}: {n}</span>
            ))}
          </div>
        )}
      </div>

      {/* Tabla de leads */}
      <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Lead</th>
              <th style={th}>Cliente</th>
              <th style={th}>Estado</th>
              <th style={th}>Owner</th>
              <th style={th}>Consultor</th>
              <th style={th}>Tel</th>
              <th style={th}>Creado</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {card.rows.map((l) => (
              <tr key={l.id}>
                <td style={td}><a href={l.zohoUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8' }}>{l.leadNumber || '—'}</a></td>
                <td style={{ ...td, color: '#e8eaf0', fontWeight: 600, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.fullName}</td>
                <td style={{ ...td, color: BUCKET_COLOR[l.bucket] }}>● {l.status || 'sin estado'}</td>
                <td style={td}>{l.owner || '—'}</td>
                <td style={td}>{l.consultor || '—'}</td>
                <td style={td}>
                  {l.phone && callHref(l.phone, '3cx')
                    ? <a href={callHref(l.phone, '3cx')!} style={{ color: '#22c55e' }} title="Llamar (3CX)">{l.phone}</a>
                    : (l.phone || '—')}
                </td>
                <td style={td}>{fmtFecha(l.createdAt)}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  {onLeadClick && (
                    <button
                      onClick={() => onLeadClick(`Abre el lead ${l.leadNumber || l.fullName}`)}
                      style={{ fontSize: 11.5, color: '#F7941D', cursor: 'pointer', background: 'none', border: '1px solid rgba(247,148,29,0.45)', borderRadius: 6, padding: '2px 9px', whiteSpace: 'nowrap' }}
                      title="Abrir ficha + tipificar"
                    >
                      Abrir
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tabla de deals (solo búsquedas por contacto) */}
      {deals.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ color: '#a78bfa', fontSize: 12, fontWeight: 700, padding: '0 4px', marginBottom: 4 }}>
            Deals del contacto ({deals.length})
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Deal</th>
                  <th style={th}>Etapa</th>
                  <th style={th}>Monto</th>
                  <th style={th}>Cliente</th>
                  <th style={th}>Owner</th>
                  <th style={th}>Creado</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d, i) => (
                  <tr key={i}>
                    <td style={{ ...td, color: '#e8eaf0' }}><a href={d.zohoUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#8da2bd' }}>{d.name}</a></td>
                    <td style={td}>{d.stage || '—'}</td>
                    <td style={td}>{d.amount || '—'}</td>
                    <td style={td}>{d.contactName || '—'}</td>
                    <td style={td}>{d.owner || '—'}</td>
                    <td style={td}>{fmtFecha(d.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
