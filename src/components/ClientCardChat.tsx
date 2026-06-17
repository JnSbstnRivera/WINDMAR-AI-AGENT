'use client';

import { type Bucket } from '@/lib/zoho-status';
import type { ZohoClientCard } from '@/lib/zoho-client-card';
import { callHref } from '@/lib/dialer';
import { TipificarForm } from './TipificarForm';
import { NoteHover } from './NoteHover';

const BUCKET_COLOR: Record<Bucket, string> = {
  nuevo: '#38bdf8', seguimiento: '#F7941D', frio: '#94a3b8', cita_pendiente: '#a78bfa',
  cita_realizada: '#22c55e', vendido: '#10b981', descartado: '#64748b', sin_estado: '#64748b',
};

/**
 * Ficha de cliente + CUADRO DE TIPIFICACIÓN (TipificarForm): datos reales +
 * llamar (3CX/Kixie) + dropdown de estados con plantilla autocompletada + nota.
 */
export function ClientCardChat({ card, onEmail }: { card: ZohoClientCard; onEmail?: () => void }) {
  const accent = card.bucket ? BUCKET_COLOR[card.bucket] : '#F7941D';
  const canAct = card.kind === 'lead' && !!card.leadId;

  return (
    <div
      className="my-3 w-full max-w-[920px] rounded-xl border-2 px-4 py-3"
      style={{ background: '#0a1628', borderColor: `${accent}66`, borderLeft: `4px solid ${accent}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ color: '#e8eaf0', fontSize: 16, fontWeight: 700 }} className="truncate">{card.fullName}</span>
            {/* Estado como badge de color */}
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999,
              color: card.status ? accent : '#10b981',
              background: `${card.status ? accent : '#10b981'}1a`,
              border: `1px solid ${card.status ? accent : '#10b981'}55`, whiteSpace: 'nowrap',
            }}>● {card.status || 'Cliente convertido'}</span>
          </div>
          <div style={{ fontSize: 12, marginTop: 3 }} className="inline-flex items-center gap-1.5">
            {card.leadNumber && <span style={{ color: '#64748b' }}>{card.leadNumber}</span>}
            {canAct && <NoteHover leadId={card.leadId!} />}
          </div>
        </div>
        <a href={card.zohoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: '#94a3b8', whiteSpace: 'nowrap' }}>Zoho ↗</a>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1" style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
        {card.email && <a href={`mailto:${card.email}`} style={{ color: '#94a3b8' }}>✉️ {card.email}</a>}
        {card.phone && (callHref(card.phone, '3cx')
          ? <a href={callHref(card.phone, '3cx')!} style={{ color: '#22c55e' }} title="Llamar (3CX)">📞 {card.phone}</a>
          : <span>📞 {card.phone}</span>)}
        {card.owner && <span>🧑‍💼 Owner: {card.owner}</span>}
        {card.consultor && <span>👤 {card.consultor}</span>}
      </div>

      {callHref(card.phone, '3cx') && (
        <div className="flex items-center gap-2" style={{ marginTop: 10 }}>
          <a href={callHref(card.phone, '3cx')!} title={`Llamar ${card.phone} con 3CX`}
            style={{ fontSize: 12, color: '#22c55e', fontWeight: 600, padding: '4px 12px', borderRadius: 7, border: '1px solid rgba(34,197,94,0.45)', background: 'rgba(34,197,94,0.08)' }}>📞 Llamar 3CX</a>
          <a href={callHref(card.phone, 'kixie')!} title={`Llamar ${card.phone} con Kixie`}
            style={{ fontSize: 12, color: '#22c55e', fontWeight: 600, padding: '4px 12px', borderRadius: 7, border: '1px solid rgba(34,197,94,0.45)', background: 'rgba(34,197,94,0.08)' }}>📞 Kixie</a>
        </div>
      )}

      <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
        <div style={{ fontSize: 12, color: '#cbd5e1' }}><b style={{ color: '#e8eaf0' }}>Sistema:</b> {card.sistemaComprado}</div>
        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
          {card.totalDeals} cotización{card.totalDeals === 1 ? '' : 'es'}{card.dealsAbiertos ? ` · ${card.dealsAbiertos} en proceso` : ''}
        </div>
        {card.deals.length > 0 && (
          <div className="flex flex-col gap-1" style={{ marginTop: 6 }}>
            {card.deals.map((d, i) => (
              <a key={i} href={d.zohoUrl} target="_blank" rel="noopener noreferrer" className="truncate" style={{ fontSize: 11.5, color: '#8da2bd' }}>
                • {d.name} · {d.stage || '—'}{d.amount ? ` · ${d.amount}` : ''}
              </a>
            ))}
          </div>
        )}
      </div>

      {canAct && (
        <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10 }}>
          <div style={{ color: '#F7941D', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📝 Tipificar</div>
          <TipificarForm
            leadId={card.leadId!}
            leadNumber={card.leadNumber}
            fullName={card.fullName}
            currentStatus={card.status}
            options={card.tipificarOptions ?? []}
            consultor={card.consultor}
          />
          {onEmail && (
            <div style={{ marginTop: 8 }}>
              <button onClick={onEmail} style={{ fontSize: 11.5, color: '#F7941D', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✉️ Enviar correo de seguimiento</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
