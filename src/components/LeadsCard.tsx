'use client';

import { Fragment, useMemo, useState } from 'react';
import { BUCKET_LABEL, type Bucket } from '@/lib/zoho-status';
import type { ZohoLeadsCard } from '@/lib/zoho-leads-card';
import { callHref } from '@/lib/dialer';
import { TipificarForm } from './TipificarForm';
import { NoteHover } from './NoteHover';

const BUCKET_COLOR: Record<Bucket, string> = {
  nuevo: '#38bdf8', seguimiento: '#F7941D', frio: '#94a3b8', cita_pendiente: '#a78bfa',
  cita_realizada: '#22c55e', vendido: '#10b981', descartado: '#64748b', sin_estado: '#64748b',
};

const fmtFecha = (iso: string | null) => (iso ? iso.slice(0, 10) : '—');

/** Filtro de fecha (sobre createdAt) — client-side, sobre las filas ya cargadas. */
type DateFilter = 'all' | 'today' | '7d' | '30d';
const DATE_LABEL: Record<DateFilter, string> = {
  all: 'Todas las fechas', today: 'Creados hoy', '7d': 'Últimos 7 días', '30d': 'Últimos 30 días',
};
function inDateRange(iso: string | null, f: DateFilter): boolean {
  if (f === 'all') return true;
  if (!iso) return false;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  if (f === 'today') return d.toDateString() === now.toDateString();
  const days = (now.getTime() - d.getTime()) / 86400000;
  return f === '7d' ? days <= 7 : days <= 30;
}

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
}: {
  card: ZohoLeadsCard;
  /** @deprecated ya no se usa: tipificar es inline en la fila. */
  onLeadClick?: (text: string) => void;
}) {
  const buckets = Object.entries(card.byBucket ?? {}).sort((a, b) => b[1] - a[1]);
  const deals = card.deals ?? [];
  const tipOptions = card.tipificarOptions ?? [];
  const [openId, setOpenId] = useState<string | null>(null); // fila expandida
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set()); // filas ya tipificadas
  const [bucketFilter, setBucketFilter] = useState<Bucket | 'all'>('all'); // filtro por estado
  const [dateFilter, setDateFilter] = useState<DateFilter>('all'); // filtro por fecha de creación

  // Filtro client-side sobre las filas ya cargadas (estado + fecha de creación).
  const visibleRows = useMemo(
    () => card.rows.filter((l) =>
      (bucketFilter === 'all' || l.bucket === bucketFilter) && inDateRange(l.createdAt, dateFilter)),
    [card.rows, bucketFilter, dateFilter],
  );
  const hasFilter = bucketFilter !== 'all' || dateFilter !== 'all';

  return (
    <div
      className="my-3 w-full rounded-xl border-2 px-3 py-3"
      style={{ background: '#0a1628', borderColor: 'rgba(247,148,29,0.4)' }}
    >
      {/* Header */}
      <div style={{ padding: '0 4px', marginBottom: 8 }}>
        <div style={{ color: '#F7941D', fontWeight: 700, fontSize: 14.5 }}>{card.title}</div>
        <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 1 }}>
          {card.subtitle}
          {hasFilter && <span style={{ color: '#F7941D' }}> · mostrando {visibleRows.length} de {card.rows.length}</span>}
        </div>

        {/* Chips de estado = filtro clickable. Click activa/desactiva. */}
        {buckets.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5" style={{ marginTop: 8 }}>
            <button
              onClick={() => setBucketFilter('all')}
              style={{
                fontSize: 11, padding: '2px 10px', borderRadius: 999, cursor: 'pointer',
                background: bucketFilter === 'all' ? '#F7941D' : 'rgba(255,255,255,0.05)',
                color: bucketFilter === 'all' ? '#1B3A5C' : '#94a3b8',
                border: '1px solid rgba(247,148,29,0.45)', fontWeight: bucketFilter === 'all' ? 700 : 400,
              }}
            >Todos: {card.rows.length}</button>
            {buckets.map(([b, n]) => {
              const active = bucketFilter === b;
              const c = BUCKET_COLOR[b as Bucket] || '#94a3b8';
              return (
                <button key={b} onClick={() => setBucketFilter(active ? 'all' : (b as Bucket))} style={{
                  fontSize: 11, padding: '2px 10px', borderRadius: 999, cursor: 'pointer',
                  background: active ? c : 'rgba(255,255,255,0.05)',
                  color: active ? '#0a1628' : c, fontWeight: active ? 700 : 400,
                  border: `1px solid ${c}${active ? 'ff' : '44'}`,
                }} title={`Filtrar por ${BUCKET_LABEL[b as Bucket] || b}`}>
                  {BUCKET_LABEL[b as Bucket] || b}: {n}
                </button>
              );
            })}
          </div>
        )}

        {/* Filtro por fecha de creación + reset */}
        <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 8 }}>
          <span style={{ fontSize: 10.5, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>📅 Fecha</span>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            style={{
              fontSize: 11.5, color: '#cbd5e1', background: '#0f1d33', cursor: 'pointer',
              border: '1px solid rgba(247,148,29,0.35)', borderRadius: 6, padding: '3px 8px',
            }}
          >
            {(Object.keys(DATE_LABEL) as DateFilter[]).map((f) => (
              <option key={f} value={f} style={{ background: '#0f1d33' }}>{DATE_LABEL[f]}</option>
            ))}
          </select>
          {hasFilter && (
            <button
              onClick={() => { setBucketFilter('all'); setDateFilter('all'); }}
              style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >Limpiar filtros</button>
          )}
        </div>
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
              <th style={th}>Creado</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ ...td, textAlign: 'center', color: '#64748b', padding: '16px 8px' }}>
                  Ningún lead coincide con el filtro.
                </td>
              </tr>
            )}
            {visibleRows.map((l) => {
              const open = openId === l.id;
              const isDone = doneIds.has(l.id);
              return (
                <Fragment key={l.id}>
                  <tr style={open ? { background: 'rgba(247,148,29,0.06)' } : undefined}>
                    <td style={td}><a href={l.zohoUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8' }}>{l.leadNumber || '—'}</a></td>
                    <td style={{ ...td, color: '#e8eaf0', fontWeight: 600, maxWidth: 220, whiteSpace: 'normal' }}>
                      <span className="inline-flex items-center gap-1.5">
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180, display: 'inline-block', whiteSpace: 'nowrap' }}>{isDone ? '✓ ' : ''}{l.fullName}</span>
                        <NoteHover leadId={l.id} />
                      </span>
                      {l.phone && (
                        <div style={{ fontSize: 11, fontWeight: 400, marginTop: 1 }}>
                          {callHref(l.phone, '3cx')
                            ? <a href={callHref(l.phone, '3cx')!} style={{ color: '#22c55e' }} title="Llamar (3CX)">📞 {l.phone}</a>
                            : <span style={{ color: '#64748b' }}>📞 {l.phone}</span>}
                        </div>
                      )}
                    </td>
                    <td style={{ ...td, color: BUCKET_COLOR[l.bucket] }}>● {l.status || 'sin estado'}</td>
                    <td style={{ ...td, whiteSpace: 'normal' }}>
                      <div>{l.owner || '—'}</div>
                      {(l.ownerEmail || l.ownerPhone) && (
                        <div style={{ fontSize: 10.5, color: '#64748b', lineHeight: 1.3 }}>
                          {l.ownerEmail && <div className="truncate" style={{ maxWidth: 150 }}>{l.ownerEmail}</div>}
                          {l.ownerPhone && <div>📞 {l.ownerPhone}</div>}
                        </div>
                      )}
                    </td>
                    <td style={{ ...td, whiteSpace: 'normal' }}>
                      <div>{l.consultor || '—'}</div>
                      {(l.consultorEmail || l.consultorPhone) && (
                        <div style={{ fontSize: 10.5, color: '#64748b', lineHeight: 1.3 }}>
                          {l.consultorEmail && <div className="truncate" style={{ maxWidth: 150 }}>{l.consultorEmail}</div>}
                          {l.consultorPhone && <div>📞 {l.consultorPhone}</div>}
                        </div>
                      )}
                    </td>
                    <td style={td}>{fmtFecha(l.createdAt)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button
                        onClick={() => setOpenId(open ? null : l.id)}
                        style={{ fontSize: 11.5, color: open ? '#1B3A5C' : '#F7941D', cursor: 'pointer', background: open ? '#F7941D' : 'none', border: '1px solid rgba(247,148,29,0.45)', borderRadius: 6, padding: '2px 9px', whiteSpace: 'nowrap' }}
                        title="Tipificar este lead sin salir de la lista"
                      >
                        {open ? 'Cerrar' : isDone ? 'Editar' : 'Tipificar'}
                      </button>
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={7} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <TipificarForm
                          leadId={l.id}
                          leadNumber={l.leadNumber}
                          fullName={l.fullName}
                          currentStatus={l.status}
                          options={tipOptions}
                          consultor={l.consultor}
                          compact
                          onSaved={() => { setDoneIds((s) => new Set(s).add(l.id)); setTimeout(() => setOpenId(null), 1200); }}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
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
