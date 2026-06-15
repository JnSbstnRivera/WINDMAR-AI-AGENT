'use client';

import { useState } from 'react';
import { ACTION_META, type ZohoPendingAction } from '@/lib/zoho-actions';

type Status = 'idle' | 'saving' | 'done' | 'error' | 'cancelled';

/**
 * Tarjeta de confirmación de una escritura en Zoho preparada por el agente.
 * El asesor revisa y confirma con 1 clic → POST /api/zoho/action ejecuta.
 * Ninguna escritura toca Zoho sin esta confirmación.
 */
export function ZohoActionCard({ action }: { action: ZohoPendingAction }) {
  const meta = ACTION_META[action.type];
  const [status, setStatus] = useState<Status>('idle');
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState(false);
  const [nota, setNota] = useState(action.nota?.contenido ?? '');

  async function confirm() {
    setStatus('saving');
    setMsg('');
    const payload: ZohoPendingAction =
      action.type === 'nota' ? { ...action, nota: { contenido: nota } } : action;
    try {
      const res = await fetch('/api/zoho/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setMsg(data.error || 'No se pudo guardar en Zoho.');
        return;
      }
      setStatus('done');
      setMsg(data.message || 'Guardado en Zoho ✓');
    } catch {
      setStatus('error');
      setMsg('Error de conexión al guardar.');
    }
  }

  // Resumen legible de un paso (usado en detalle simple y en compound)
  const stepLine = (a: ZohoPendingAction): string => {
    if (a.type === 'estado') return `🏷️ Estado → ${a.estado?.nuevoEstado || ''}`;
    if (a.type === 'nota') return `📝 Nota: ${a.nota?.contenido || ''}`;
    if (a.type === 'seguimiento') {
      return [
        a.seguimiento?.callDate ? `📞 Llamar desde ${a.seguimiento.callDate}` : '',
        a.seguimiento?.appointmentAt ? `📅 Cita ${a.seguimiento.appointmentAt.replace('T', ' ').slice(0, 16)}` : '',
        a.seguimiento?.nota ? `📝 ${a.seguimiento.nota}` : '',
      ].filter(Boolean).join('  ·  ');
    }
    return a.summary;
  };

  // Detalle legible según el tipo
  const detalle =
    action.type === 'nota'
      ? null // se muestra en el textarea / preview
      : action.type === 'estado'
      ? action.estado?.nuevoEstado
      : action.type === 'seguimiento'
      ? stepLine(action)
      : null; // compound se renderiza como lista aparte

  const done = status === 'done';
  const closed = done || status === 'cancelled'; // estado final: oculta botones/cuerpo
  const accent = done ? '#22c55e' : status === 'error' ? '#f87171' : status === 'cancelled' ? '#94a3b8' : '#F7941D';

  return (
    <div
      className="my-3 w-full max-w-[640px] rounded-xl border-2 px-4 py-3"
      style={{ background: '#0a1628', borderColor: `${accent}66` }}
    >
      {/* Header */}
      <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>{done ? '✅' : status === 'cancelled' ? '✖️' : meta.emoji}</span>
        <span style={{ color: accent, fontWeight: 700, fontSize: 14 }}>
          {done ? 'Guardado en Zoho' : status === 'cancelled' ? 'Cancelado' : meta.label}
        </span>
        <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 'auto' }}>
          {action.fullName}
          {action.leadNumber ? ` · ${action.leadNumber}` : ''}
        </span>
      </div>

      {/* Cuerpo */}
      {!closed && action.type === 'nota' && (
        editing ? (
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={4}
            disabled={status === 'saving'}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, lineHeight: 1.5,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#e8eaf0', outline: 'none', resize: 'vertical',
            }}
          />
        ) : (
          <div style={{ color: '#e8eaf0', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{nota}</div>
        )
      )}
      {!closed && (action.type === 'estado' || action.type === 'seguimiento') && (
        <div style={{ color: '#e8eaf0', fontSize: 13, lineHeight: 1.5 }}>{detalle}</div>
      )}
      {!closed && action.type === 'compound' && (
        <div className="flex flex-col gap-1">
          {(action.steps || []).map((s, i) => (
            <div key={i} style={{ color: '#e8eaf0', fontSize: 13, lineHeight: 1.5 }}>• {stepLine(s)}</div>
          ))}
        </div>
      )}

      {/* Mensaje de resultado */}
      {msg && (
        <div style={{ color: accent, fontSize: 12.5, marginTop: 8 }}>{msg}</div>
      )}

      {/* Botones */}
      {!closed && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button
            onClick={confirm}
            disabled={status === 'saving'}
            style={{
              fontSize: 13, fontWeight: 600, padding: '7px 16px', borderRadius: 8,
              cursor: status === 'saving' ? 'wait' : 'pointer', border: '1px solid #F7941D',
              background: status === 'saving' ? 'transparent' : '#F7941D',
              color: status === 'saving' ? '#F7941D' : '#1B3A5C',
            }}
          >
            {status === 'saving' ? 'Guardando…' : '✅ Confirmar'}
          </button>
          {action.type === 'nota' && (
            <button
              onClick={() => setEditing((e) => !e)}
              disabled={status === 'saving'}
              style={{
                fontSize: 13, padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                border: '1px solid rgba(247,148,29,0.5)', background: 'transparent', color: '#F7941D',
              }}
            >
              {editing ? '✔️ Listo' : '✏️ Editar'}
            </button>
          )}
          <button
            onClick={() => { setStatus('cancelled'); setMsg('No se guardó nada.'); }}
            disabled={status === 'saving'}
            style={{
              fontSize: 13, padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
              border: '1px solid rgba(148,163,184,0.4)', background: 'transparent', color: '#94a3b8',
            }}
          >
            ✖️ Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
