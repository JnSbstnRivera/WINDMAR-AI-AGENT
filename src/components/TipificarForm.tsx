'use client';

import { useRef, useState } from 'react';
import type { ZohoPendingAction } from '@/lib/zoho-actions';
import type { TipificarOpt } from '@/lib/zoho-client-card';

const CALL_TEMPLATE = '📞 Llamada realizada — resultado: __';

/**
 * Cuadro de tipificación reutilizable (ficha del cliente y filas de la tabla):
 * dropdown de estados + nota que se autocompleta con la plantilla del estado +
 * botón "solo llamada". Guarda estado+nota en Zoho en un clic (/api/zoho/action).
 */
export function TipificarForm({
  leadId,
  leadNumber,
  fullName,
  currentStatus,
  options,
  compact,
  onSaved,
}: {
  leadId: string;
  leadNumber: string | null;
  fullName: string;
  currentStatus: string | null;
  options: TipificarOpt[];
  compact?: boolean;
  onSaved?: () => void;
}) {
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);
  const appliedTpl = useRef(''); // última plantilla autocompletada (para no pisar lo escrito)

  function pickStatus(status: string) {
    setNuevoEstado(status);
    const tpl = options.find((o) => o.status === status)?.plantilla || '';
    // Autocompleta la nota solo si está vacía o aún tiene una plantilla previa.
    if (tpl && (nota.trim() === '' || nota === appliedTpl.current)) {
      setNota(tpl);
      appliedTpl.current = tpl;
    }
  }
  function soloLlamada() {
    if (nota.trim() === '' || nota === appliedTpl.current) {
      setNota(CALL_TEMPLATE);
      appliedTpl.current = CALL_TEMPLATE;
    }
  }

  async function guardar() {
    if (!nuevoEstado && nota.trim().length < 2) { setMsg('Elige un estado o escribe una nota.'); return; }
    setSaving(true); setMsg('');
    const steps: ZohoPendingAction[] = [];
    if (nuevoEstado) steps.push({ type: 'estado', leadId, leadNumber, fullName, summary: `estado → ${nuevoEstado}`, estado: { nuevoEstado } });
    if (nota.trim().length >= 2) steps.push({ type: 'nota', leadId, leadNumber, fullName, summary: 'nota', nota: { contenido: nota.trim() } });
    const action: ZohoPendingAction = steps.length === 1 ? steps[0]
      : { type: 'compound', leadId, leadNumber, fullName, summary: steps.map((s) => s.summary).join(' · '), steps };
    try {
      const res = await fetch('/api/zoho/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setSaving(false); setMsg(data.error || 'No se pudo guardar.'); return; }
      setDone(true); setMsg(data.message || 'Guardado ✓');
      onSaved?.();
    } catch { setSaving(false); setMsg('Error de conexión.'); }
  }

  if (done) {
    return <div style={{ color: '#22c55e', fontSize: 12.5, fontWeight: 600, padding: compact ? '4px 0' : '6px 0' }}>✅ {msg}</div>;
  }

  const inputBase: React.CSSProperties = {
    width: '100%', padding: '6px 9px', borderRadius: 8, fontSize: 13,
    background: '#13243b', color: '#e8eaf0', border: '1px solid rgba(255,255,255,0.15)', outline: 'none',
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 items-center flex-wrap">
        <select value={nuevoEstado} onChange={(e) => pickStatus(e.target.value)} disabled={saving} style={{ ...inputBase, flex: 1, minWidth: 160 }}>
          <option value="" style={{ background: '#13243b' }}>No cambiar status — solo dejar nota{currentStatus ? ` (actual: ${currentStatus})` : ''}</option>
          {options.map((o) => <option key={o.status} value={o.status} style={{ background: '#13243b' }}>{o.status}</option>)}
        </select>
        <button onClick={soloLlamada} disabled={saving} style={{ fontSize: 11.5, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', border: '1px solid rgba(247,148,29,0.5)', color: '#F7941D', background: 'transparent', whiteSpace: 'nowrap' }} title="Registrar solo la llamada (sin cambiar estado)">
          📞 Solo llamada
        </button>
      </div>
      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Nota — qué pasó, próximo paso…"
        rows={compact ? 2 : 2}
        disabled={saving}
        style={{ ...inputBase, lineHeight: 1.45, resize: 'vertical', background: 'rgba(255,255,255,0.05)' }}
      />
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={guardar} disabled={saving} style={{ fontSize: 13, fontWeight: 600, padding: '6px 16px', borderRadius: 8, cursor: saving ? 'wait' : 'pointer', border: '1px solid #F7941D', background: saving ? 'transparent' : '#F7941D', color: saving ? '#F7941D' : '#1B3A5C' }}>
          {saving ? 'Guardando…' : '✅ Guardar en Zoho'}
        </button>
        {msg && <span style={{ fontSize: 12, color: '#fca5a5' }}>{msg}</span>}
      </div>
    </div>
  );
}
