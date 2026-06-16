'use client';

import { useState } from 'react';
import { BUCKET_LABEL, type Bucket } from '@/lib/zoho-status';
import type { ZohoClientCard } from '@/lib/zoho-client-card';
import type { ZohoPendingAction } from '@/lib/zoho-actions';
import { callHref } from '@/lib/dialer';

const BUCKET_COLOR: Record<Bucket, string> = {
  nuevo: '#38bdf8', seguimiento: '#F7941D', frio: '#94a3b8', cita_pendiente: '#a78bfa',
  cita_realizada: '#22c55e', vendido: '#10b981', descartado: '#64748b', sin_estado: '#64748b',
};

/**
 * Ficha de cliente + CUADRO DE TIPIFICACIÓN (estilo NOTAS VASS/TM): datos reales
 * + llamar (3CX/Kixie) + un form para cambiar estado (dropdown de opciones
 * editables en /admin/zoho) y dejar nota, que escribe en Zoho con un clic.
 */
export function ClientCardChat({ card, onEmail }: { card: ZohoClientCard; onEmail?: () => void }) {
  const accent = card.bucket ? BUCKET_COLOR[card.bucket] : '#F7941D';
  const canAct = card.kind === 'lead' && !!card.leadId;
  const opciones = card.tipificarOptions ?? [];

  // Estado del cuadro de tipificación
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);

  async function guardar() {
    if (!card.leadId) return;
    if (!nuevoEstado && nota.trim().length < 2) {
      setMsg('Elige un estado o escribe una nota.');
      return;
    }
    setSaving(true);
    setMsg('');
    // Compuesta: estado (si cambió) + nota (si hay) en una sola escritura.
    const steps: ZohoPendingAction[] = [];
    if (nuevoEstado) {
      steps.push({ type: 'estado', leadId: card.leadId, leadNumber: card.leadNumber, fullName: card.fullName, summary: `estado → ${nuevoEstado}`, estado: { nuevoEstado } });
    }
    if (nota.trim().length >= 2) {
      steps.push({ type: 'nota', leadId: card.leadId, leadNumber: card.leadNumber, fullName: card.fullName, summary: 'nota', nota: { contenido: nota.trim() } });
    }
    const action: ZohoPendingAction = steps.length === 1 ? steps[0]
      : { type: 'compound', leadId: card.leadId, leadNumber: card.leadNumber, fullName: card.fullName, summary: steps.map((s) => s.summary).join(' · '), steps };
    try {
      const res = await fetch('/api/zoho/action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setSaving(false); setMsg(data.error || 'No se pudo guardar en Zoho.'); return; }
      setDone(true);
      setMsg(data.message || 'Guardado en Zoho ✓');
    } catch {
      setSaving(false);
      setMsg('Error de conexión al guardar.');
    }
  }

  return (
    <div className="my-3 w-full max-w-[680px] rounded-xl border-2 px-4 py-3" style={{ background: '#0a1628', borderColor: 'rgba(247,148,29,0.4)' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div style={{ color: '#e8eaf0', fontSize: 16, fontWeight: 700 }} className="truncate">{card.fullName}</div>
          <div style={{ fontSize: 12, marginTop: 2 }}>
            {card.status ? <span style={{ color: accent }}>● {card.status}</span> : <span style={{ color: '#10b981' }}>● Cliente (convertido)</span>}
            {card.leadNumber && <span style={{ color: '#64748b' }}> · {card.leadNumber}</span>}
          </div>
        </div>
        <a href={card.zohoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: '#94a3b8', whiteSpace: 'nowrap' }}>Zoho ↗</a>
      </div>

      {/* Contacto */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1" style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
        {card.email && <span>✉️ {card.email}</span>}
        {card.phone && <span>📞 {card.phone}</span>}
        {card.owner && <span>🧑‍💼 Owner: {card.owner}</span>}
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

      {/* CUADRO DE TIPIFICACIÓN (solo leads con id) */}
      {canAct && !done && (
        <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10 }}>
          <div style={{ color: '#F7941D', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📝 Tipificar</div>
          <div className="flex flex-col gap-2">
            <select
              value={nuevoEstado}
              onChange={(e) => setNuevoEstado(e.target.value)}
              disabled={saving}
              style={{ width: '100%', padding: '7px 9px', borderRadius: 8, fontSize: 13, background: '#13243b', color: '#e8eaf0', border: '1px solid rgba(255,255,255,0.15)', outline: 'none' }}
            >
              <option value="" style={{ background: '#13243b', color: '#94a3b8' }}>
                — Cambiar estado{card.status ? ` (actual: ${card.status})` : ''} —
              </option>
              {opciones.map((s) => (
                <option key={s} value={s} style={{ background: '#13243b', color: '#e8eaf0' }}>{s}</option>
              ))}
            </select>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Nota (opcional) — qué pasó, próximo paso…"
              rows={2}
              disabled={saving}
              style={{ width: '100%', padding: '7px 9px', borderRadius: 8, fontSize: 13, lineHeight: 1.45, background: 'rgba(255,255,255,0.05)', color: '#e8eaf0', border: '1px solid rgba(255,255,255,0.15)', outline: 'none', resize: 'vertical' }}
            />
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={guardar}
                disabled={saving}
                style={{ fontSize: 13, fontWeight: 600, padding: '7px 16px', borderRadius: 8, cursor: saving ? 'wait' : 'pointer', border: '1px solid #F7941D', background: saving ? 'transparent' : '#F7941D', color: saving ? '#F7941D' : '#1B3A5C' }}
              >
                {saving ? 'Guardando…' : '✅ Guardar en Zoho'}
              </button>
              {msg && <span style={{ fontSize: 12, color: '#fca5a5' }}>{msg}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Resultado guardado */}
      {done && (
        <div style={{ marginTop: 10, borderTop: '1px solid rgba(34,197,94,0.25)', paddingTop: 8, color: '#22c55e', fontSize: 13, fontWeight: 600 }}>
          ✅ {msg}
        </div>
      )}

      {onEmail && !done && (
        <div style={{ marginTop: 8 }}>
          <button onClick={onEmail} style={{ fontSize: 11.5, color: '#F7941D', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✉️ Enviar correo de seguimiento</button>
        </div>
      )}
    </div>
  );
}
