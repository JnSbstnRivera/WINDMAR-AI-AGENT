'use client';

import { useEffect, useState } from 'react';
import { BUCKET_LABEL, type Bucket } from '@/lib/zoho-status';

export interface AssignUser {
  email: string;
  name: string;
  rol: string;
}

interface Lead {
  id: string;
  leadNumber: string | null;
  fullName: string;
  status: string | null;
  bucket: Bucket;
  phone: string | null;
  email: string | null;
  owner: string | null;
  consultor: string | null;
  createdAt: string | null;
  appointmentAt: string | null; // Cita Date/Time (Presenter_Appointment)
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
  const [manualSource, setManualSource] = useState('');
  const [target, setTarget] = useState('');
  const [manualTarget, setManualTarget] = useState('');
  const [zohoUsers, setZohoUsers] = useState<Array<{ name: string; email: string }>>([]);
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  // Filtro por fecha de CITA (Presenter_Appointment) — caso de Jesús (TM):
  // ver citas de hoy / futuras / una fecha específica.
  const [citaFilter, setCitaFilter] = useState<'todas' | 'hoy' | 'futuras' | 'fecha'>('todas');
  const [citaFecha, setCitaFecha] = useState<string>(''); // YYYY-MM-DD
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Lista completa de usuarios Zoho (incluye developers/data analysts que no
  // usan la app) para la búsqueda manual con datalist.
  useEffect(() => {
    fetch('/api/admin/zoho-users')
      .then((r) => r.json())
      .then((d) => setZohoUsers(d.users || []))
      .catch(() => {});
  }, []);

  // La búsqueda manual tiene prioridad sobre el dropdown.
  const effectiveSource = manualSource.trim().toLowerCase() || source;
  const effectiveTarget = manualTarget.trim().toLowerCase() || target;

  async function loadLeads() {
    if (!effectiveSource) return;
    setLoading(true);
    setMsg(null);
    setLeads(null);
    setSelected(new Set());
    setStatusFilter('');
    try {
      const res = await fetch(`/api/zoho/my-leads?owner=${encodeURIComponent(effectiveSource)}`);
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

  // Hoy en PR (YYYY-MM-DD) para los filtros de cita.
  const hoyPR = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Puerto_Rico', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const citaDay = (l: Lead) => (l.appointmentAt || '').slice(0, 10);

  // Leads visibles según filtro de estado + filtro de fecha de cita.
  const visible = (leads ?? [])
    .filter((l) => (statusFilter ? (l.status || 'sin estado') === statusFilter : true))
    .filter((l) => {
      if (citaFilter === 'todas') return true;
      const d = citaDay(l);
      if (!d) return false;
      if (citaFilter === 'hoy') return d === hoyPR;
      if (citaFilter === 'futuras') return d >= hoyPR;
      if (citaFilter === 'fecha') return citaFecha ? d === citaFecha : true;
      return true;
    });
  const distinctStatuses = leads
    ? Array.from(
        leads.reduce((m, l) => {
          const s = l.status || 'sin estado';
          m.set(s, (m.get(s) || 0) + 1);
          return m;
        }, new Map<string, number>())
      ).sort((a, b) => b[1] - a[1])
    : [];

  function toggleAll() {
    if (visible.length === 0) return;
    setSelected((prev) =>
      prev.size === visible.length ? new Set() : new Set(visible.map((l) => l.id))
    );
  }

  async function assign() {
    if (!effectiveTarget || selected.size === 0) return;
    if (effectiveTarget === effectiveSource) {
      setMsg({ kind: 'err', text: 'El destino es el mismo asesor de origen.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/zoho/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: Array.from(selected), ownerEmail: effectiveTarget }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ kind: 'err', text: data.error || 'Error asignando' });
        return;
      }
      setMsg({
        kind: 'ok',
        text: `Asignados ${data.success}/${data.total} a ${effectiveTarget}${data.failed ? ` · ${data.failed} fallaron` : ''}.`,
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

      {/* Datalist con TODOS los usuarios Zoho (para búsqueda manual) */}
      <datalist id="zoho-users-list">
        {zohoUsers.map((u) => (
          <option key={u.email} value={u.email}>
            {u.name}
          </option>
        ))}
      </datalist>

      {/* Origen */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <span style={{ color: 'var(--text2)', fontSize: 13 }}>Ver leads de:</span>
        <select
          value={source}
          onChange={(e) => { setSource(e.target.value); setManualSource(''); }}
          style={selectStyle}
        >
          <option value="">— elige asesor —</option>
          {users.map((u) => (
            <option key={u.email} value={u.email} style={{ background: '#0f1525' }}>
              {u.name} ({u.rol})
            </option>
          ))}
        </select>
        <span style={{ color: 'var(--text3)', fontSize: 12 }}>o búsqueda manual:</span>
        <input
          value={manualSource}
          onChange={(e) => setManualSource(e.target.value)}
          list="zoho-users-list"
          placeholder="correo de cualquier usuario Zoho (ej. developer)"
          style={{ ...selectStyle, minWidth: 280 }}
        />
        <button onClick={loadLeads} disabled={!effectiveSource || loading} style={btn('#38bdf8', !effectiveSource || loading)}>
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
              {/* Barra: seleccionar todos + filtro por Lead Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                <label style={{ color: 'var(--text2)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={selected.size === visible.length && visible.length > 0} onChange={toggleAll} />
                  Seleccionar todos ({visible.length})
                </label>
                <span style={{ color: 'var(--text3)', fontSize: 12 }}>· {selected.size} seleccionados</span>
                <span style={{ color: 'var(--text2)', fontSize: 12, marginLeft: 'auto' }}>Filtrar estado:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setSelected(new Set()); }}
                  style={{ ...selectStyle, minWidth: 190 }}
                >
                  <option value="">Todos ({leads.length})</option>
                  {distinctStatuses.map(([s, n]) => (
                    <option key={s} value={s} style={{ background: '#0f1525' }}>
                      {s} ({n})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por fecha de CITA (Presenter_Appointment) — caso TM (Jesús) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text2)', fontSize: 12 }}>📅 Cita:</span>
                {([['todas', 'Todas'], ['hoy', 'Hoy'], ['futuras', 'Futuras']] as const).map(([k, lbl]) => (
                  <button
                    key={k}
                    onClick={() => { setCitaFilter(k); setSelected(new Set()); }}
                    style={{ ...selectStyle, cursor: 'pointer', borderColor: citaFilter === k ? '#F7941D' : 'var(--glass-border)', color: citaFilter === k ? '#F7941D' : 'var(--text2)' }}
                  >
                    {lbl}
                  </button>
                ))}
                <input
                  type="date"
                  value={citaFecha}
                  onChange={(e) => { setCitaFecha(e.target.value); setCitaFilter(e.target.value ? 'fecha' : 'todas'); setSelected(new Set()); }}
                  style={{ ...selectStyle, borderColor: citaFilter === 'fecha' ? '#F7941D' : 'var(--glass-border)', colorScheme: 'dark' }}
                  title="Ver citas de una fecha específica"
                />
                {citaFilter !== 'todas' && (
                  <span style={{ color: 'var(--text3)', fontSize: 12 }}>{visible.length} con cita</span>
                )}
              </div>

              {/* Tabla en columnas */}
              <div style={{ maxHeight: 440, overflowY: 'auto', borderRadius: 10, border: '1px solid var(--glass-border)' }}>
                {/* Header */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '30px 1.5fr 1.1fr 1fr 1fr 88px 110px',
                    gap: 8, padding: '8px 12px', position: 'sticky', top: 0, zIndex: 1,
                    background: '#0f1525', borderBottom: '1px solid var(--glass-border)',
                    fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#F7941D', fontWeight: 700,
                  }}
                >
                  <span />
                  <span>Cliente</span>
                  <span>Estado</span>
                  <span>Lead Owner</span>
                  <span>Consultor</span>
                  <span>Creado</span>
                  <span style={{ textAlign: 'right' }}>Acciones</span>
                </div>
                {visible.map((l) => (
                  <div
                    key={l.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '30px 1.5fr 1.1fr 1fr 1fr 88px 110px',
                      gap: 8, padding: '8px 12px', alignItems: 'center',
                      background: selected.has(l.id) ? 'rgba(56,189,248,0.1)' : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} />
                    <div style={{ minWidth: 0 }}>
                      <a
                        href={l.zohoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--text1)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
                        title={`Abrir ${l.leadNumber || ''} en Zoho`}
                      >
                        {l.fullName}
                      </a>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {l.leadNumber || ''}{l.phone ? ` · ${l.phone}` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: BUCKET_COLOR[l.bucket] || '#94a3b8' }}>
                      ● {l.status || 'sin estado'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.owner || ''}>
                      {l.owner || '—'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.consultor || ''}>
                      {l.consultor || '—'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>{l.createdAt ? l.createdAt.slice(0, 10) : '—'}</span>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button onClick={() => addNote(l)} disabled={busy} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 7, cursor: 'pointer', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text2)' }}>
                        + Nota
                      </button>
                      <a href={l.zohoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#38bdf8', alignSelf: 'center' }}>
                        Zoho ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Barra de asignación */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--glass-border)' }}>
                <span style={{ color: 'var(--text2)', fontSize: 13 }}>Asignar {selected.size} a:</span>
                <select
                  value={target}
                  onChange={(e) => { setTarget(e.target.value); setManualTarget(''); }}
                  style={selectStyle}
                >
                  <option value="">— elige destino —</option>
                  {users.map((u) => (
                    <option key={u.email} value={u.email} style={{ background: '#0f1525' }}>
                      {u.name} ({u.rol})
                    </option>
                  ))}
                </select>
                <span style={{ color: 'var(--text3)', fontSize: 12 }}>o manual:</span>
                <input
                  value={manualTarget}
                  onChange={(e) => setManualTarget(e.target.value)}
                  list="zoho-users-list"
                  placeholder="correo destino"
                  style={{ ...selectStyle, minWidth: 220 }}
                />
                <button onClick={assign} disabled={busy || !effectiveTarget || selected.size === 0} style={btn('#F7941D', busy || !effectiveTarget || selected.size === 0)}>
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
