'use client';

import { BUCKET_LABEL, type Bucket } from '@/lib/zoho-status';
import type { ZohoClientCard } from '@/lib/zoho-client-card';
import { callHref } from '@/lib/dialer';

const BUCKET_COLOR: Record<Bucket, string> = {
  nuevo: '#38bdf8', seguimiento: '#F7941D', frio: '#94a3b8', cita_pendiente: '#a78bfa',
  cita_realizada: '#22c55e', vendido: '#10b981', descartado: '#64748b', sin_estado: '#64748b',
};

/**
 * Ficha de cliente rica en el chat (datos estructurados, no redactados por el
 * modelo). Incluye llamar (3CX/Kixie) y acciones de 1 clic que disparan el flujo
 * de confirmación (nota / estado / seguimiento) vía onSend.
 */
export function ClientCardChat({
  card,
  onSend,
  onEmail,
}: {
  card: ZohoClientCard;
  onSend?: (text: string) => void;
  onEmail?: () => void;
}) {
  const ref = card.leadNumber ? ` (${card.leadNumber})` : '';
  const accent = card.bucket ? BUCKET_COLOR[card.bucket] : '#F7941D';
  const canAct = card.kind === 'lead' && !!card.leadId && !!onSend;

  const chip = (label: string, text: string, color = '#F7941D') => (
    <button
      onClick={() => onSend?.(text)}
      style={{ fontSize: 11.5, padding: '5px 10px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${color}66`, color, background: 'transparent', whiteSpace: 'nowrap' }}
    >
      {label}
    </button>
  );

  return (
    <div className="my-3 w-full max-w-[680px] rounded-xl border-2 px-4 py-3" style={{ background: '#0a1628', borderColor: 'rgba(247,148,29,0.4)' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div style={{ color: '#e8eaf0', fontSize: 16, fontWeight: 700 }} className="truncate">{card.fullName}</div>
          <div style={{ fontSize: 12, marginTop: 2 }}>
            {card.status ? (
              <span style={{ color: accent }}>● {card.status}</span>
            ) : (
              <span style={{ color: '#10b981' }}>● Cliente (convertido)</span>
            )}
            {card.leadNumber && <span style={{ color: '#64748b' }}> · {card.leadNumber}</span>}
          </div>
        </div>
        <a href={card.zohoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: '#94a3b8', whiteSpace: 'nowrap' }}>Zoho ↗</a>
      </div>

      {/* Contacto */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1" style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
        {card.email && <span>✉️ {card.email}</span>}
        {card.phone && <span>📞 {card.phone}</span>}
        {card.consultor && <span>👤 {card.consultor}</span>}
      </div>

      {/* Llamar */}
      {callHref(card.phone, '3cx') && (
        <div className="flex items-center gap-3" style={{ marginTop: 8 }}>
          <a href={callHref(card.phone, '3cx')!} style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }} title={`Llamar ${card.phone} con 3CX`}>📞 Llamar 3CX</a>
          <a href={callHref(card.phone, 'kixie')!} style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }} title={`Llamar ${card.phone} con Kixie`}>📞 Kixie</a>
        </div>
      )}

      {/* Sistema + deals */}
      <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
        <div style={{ fontSize: 12, color: '#cbd5e1' }}>
          <b style={{ color: '#e8eaf0' }}>Sistema:</b> {card.sistemaComprado}
        </div>
        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
          {card.totalDeals} cotización{card.totalDeals === 1 ? '' : 'es'}{card.dealsAbiertos ? ` · ${card.dealsAbiertos} en proceso` : ''}
        </div>
        {card.deals.length > 0 && (
          <div className="flex flex-col gap-1" style={{ marginTop: 6 }}>
            {card.deals.map((d, i) => (
              <a key={i} href={d.zohoUrl} target="_blank" rel="noopener noreferrer"
                 className="truncate" style={{ fontSize: 11.5, color: '#8da2bd' }}>
                • {d.name} · {d.stage || '—'}{d.amount ? ` · ${d.amount}` : ''}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Acciones 1-clic (solo leads con id) */}
      {canAct && (
        <div className="flex flex-wrap gap-2" style={{ marginTop: 10 }}>
          {chip('📵 No contestó', `Marca a ${card.fullName}${ref} como No Contesta`)}
          {chip('📅 Cita coordinada', `Marca a ${card.fullName}${ref} como Cita Coordinada`, '#a78bfa')}
          {chip('✅ Vendido', `Marca a ${card.fullName}${ref} como Caso Vendido`, '#10b981')}
          {chip('📝 Nota', `Quiero dejarle una nota a ${card.fullName}${ref}`)}
          {chip('⏰ Seguimiento', `Prográmame seguimiento para ${card.fullName}${ref}`)}
          {onEmail && (
            <button onClick={onEmail} style={{ fontSize: 11.5, padding: '5px 10px', borderRadius: 999, cursor: 'pointer', border: '1px solid rgba(247,148,29,0.4)', color: '#F7941D', background: 'transparent' }}>
              ✉️ Correo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
