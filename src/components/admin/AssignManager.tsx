'use client';

import { useState } from 'react';
import { BUCKET_LABEL, type Bucket } from '@/lib/zoho-status';

export interface AssignUser {
  email: string;
  name: string;
  rol: string;
}

interface Lead {
  id: string;
  fullName: string;
  status: string | null;
  bucket: Bucket;
  phone: string | null;
  email: string | null;
  zohoUrl: string;
}

const BUCKET_COLOR: Record<string, string> = {
  nuevo: '#38bdf8',
  seguimiento: '#F7941D',
  frio: '#94a3b8',
  cita_pendiente: '#a78bfa',
  cita_realizada: '#22c55e',
  vendido: '#10b981',
  descartado: '#64748b',
  sin_estado: '#64748b',
};

export function AssignManager({ users }: { users: AssignUser[] }) {
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  async function loadLeads() {
    if (!source) return;
    setLoading(true);
    setMsg(null);
    setLeads(null);
    setSelected(new Set());
    try {
      const res = await fetch(`/api/zoho/my-leads?owner=${encodeURIComponent(source)}`);
      const data = await res.json();
      if (!res.ok) {
        setMsg({ kind: 'err', text: data.error || 'Error cargando leads' });
        return;
      }
      setLeads(data.leads as Lead[]);
    } catch {
      setMsg({ kind: 'err', text: 'Error de conexión' });
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (!leads) return;
    setSelected((prev) => (prev.size === leads.length ? new Set() : new Set(leads.map((l) => l.id))));
  }

  async function assign() {
    if (!target || selected.size === 0) return;
    if (target === source) {
      setMsg({ kind: 'err', text: 'El destino es el mismo asesor de origen.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/zoho/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: Array.from(selected), ownerEmail: target }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ kind: 'err', text: data.error || 'Error asignando' });
        return;
      }
      setMsg({
        kind: 'ok',
        text: `Asignados ${data.success}/${data.total} a ${target}${data.failed ? ` · ${data.failed} fallaron` : ''}.`,
      });
      // Quitar los asignados de la vista (ya no son del origen)
      setLeads((prev) => (prev ? prev.filter((l) => !selected.has(l.id)) : prev));
      setSelected(new Set());
    } catch {
      setMsg({ kind: 'err', text: 'Error de conexión' });
    } finally {
      setBusy(false);
    }
  }

  async function addNote(lead: Lead) {
    const content = window.prompt(`Nota para ${lead.fullName}:`);
    if (!content || content.trim().length < 2) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/zoho/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, content: content.trim() }),
      });
      const data = await res.json();
      setMsg(
        res.ok
          ? { kind: 'ok', text: `Nota guardada en ${lead.fullName}.` }
          : { kind: 'err', text: data.error || 'Error guardando nota' }
      );
    } catch {
      setMsg({ kind: 'err', text: 'Error de conexión' });
    } finally {
      setBusy(false);
    }
  }

  const selectStyle: React.CSSProperties = {
    background: '#0f1525',
    color: '#E8EAF0',
    border: '1px solid var(--glass-border)',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    minWidth: 220,
  };
  const btn = (color: string, disabled: boolean): React.CSSProperties => ({
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 16px',
    borderRadius: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: `1px solid ${color}`,
    background: disabled ? 'transparent' : color,
    color: disabled ? 'var(--text3)' : '#0c1322',
    opacity: disabled ? 0.5 : 1,
  });

  return (
    <div style={{ marginTop: 8 }}>
      <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--text1)', margin: '0 0 4px' }}>
        Asignación de leads
      </h1>
      <p style={{ color: 'var(--text2)', fontSize: 13, margin: '0 0 20px' }}>
        Mira la cartera de un asesor, selecciona leads y reasígnalos. Cada acción queda auditada.
      </p>

      {/* Origen */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <span style={{ color: 'var(--text2)', fontSize: 13 }}>Ver leads de:</span>
        <select value={source} onChange={(e) => setSource(e.target.value)} style={selectStyle}>
          <option value="">— elige asesor —</option>
          {users.map((u) => (
            <option key={u.email} value={u.email} style={{ background: '#0f1525' }}>
              {u.name} ({u.rol})
            </option>
          ))}
        </select>
        <button onClick={loadLeads} disabled={!source || loading} style={btn('#38bdf8', !source || loading)}>
          {loading ? 'Cargando…' : 'Cargar cartera'}
        </button>
      </div>

      {msg && (
        <div
          style={{
            marginBottom: 14, padding: '10px 14px', borderRadius: 10, fontSize: 13,
            background: msg.kind === 'ok' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            color: msg.kind === 'ok' ? '#22c55e' : '#fca5a5',
            border: `1px solid ${msg.kind === 'ok' ? '#22c55e55' : '#ef444455'}`,
          }}
        >
          {msg.text}
        </div>
      )}

      {/* Lista de leads */}
      {leads && (
        <>
          {leads.length === 0 ? (
            <div style={{ color: 'var(--text2)', fontSize: 13 }}>Ese asesor no tiene leads.</div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <label style={{ color: 'var(--text2)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={selected.size === leads.length && leads.length > 0} onChange={toggleAll} />
                  Seleccionar todos ({leads.length})
                </label>
                <span style={{ color: 'var(--text3)', fontSize: 12 }}>· {selected.size} seleccionados</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
                {leads.map((l) => (
                  <div
                    key={l.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                      borderRadius: 10, background: selected.has(l.id) ? 'rgba(56,189,248,0.1)' : 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'var(--text1)', fontSize: 14, fontWeight: 500 }}>{l.fullName}</div>
                      <div style={{ fontSize: 11, marginTop: 2 }}>
                        <span style={{ color: BUCKET_COLOR[l.bucket] || '#94a3b8' }}>● {l.status || 'sin estado'}</span>
                        <span style={{ color: 'var(--text3)' }}> · {BUCKET_LABEL[l.bucket]}</span>
                        {l.phone && <span style={{ color: 'var(--text3)' }}> · {l.phone}</span>}
                      </div>
                    </div>
                    <button onClick={() => addNote(l)} disabled={busy} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, cursor: 'pointer', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text2)' }}>
                      + Nota
                    </button>
                    <a href={l.zohoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--text3)' }}>
                      Zoho ↗
                    </a>
                  </div>
                ))}
              </div>

              {/* Barra de asignación */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--glass-border)' }}>
                <span style={{ color: 'var(--text2)', fontSize: 13 }}>Asignar {selected.size} a:</span>
                <select value={target} onChange={(e) => setTarget(e.target.value)} style={selectStyle}>
                  <option value="">— elige destino —</option>
                  {users.map((u) => (
                    <option key={u.email} value={u.email} style={{ background: '#0f1525' }}>
                      {u.name} ({u.rol})
                    </option>
                  ))}
                </select>
                <button onClick={assign} disabled={busy || !target || selected.size === 0} style={btn('#F7941D', busy || !target || selected.size === 0)}>
                  {busy ? 'Asignando…' : `Reasignar ${selected.size}`}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
