'use client';

import { useEffect, useState } from 'react';
import { BUCKET_LABEL, type Bucket } from '@/lib/zoho-status';
import { OwnerSelect } from './OwnerSelect';
import { downloadCSV } from '@/lib/csv';

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
  const [manualSource, setManualSource] = useState('');
  const [candidates, setCandidates] = useState<Array<{ name: string; email: string }>>([]); // desambiguación de owner
  const [targets, setTargets] = useState<string[]>([]); // destinos para reparto equitativo
  const [targetInput, setTargetInput] = useState('');
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

  const effectiveSource = manualSource.trim().toLowerCase();

  // Nombre legible de un correo (de la app o de Zoho) para el preview.
  const nameOf = (email: string) =>
    users.find((u) => u.email.toLowerCase() === email)?.name ||
    zohoUsers.find((u) => u.email.toLowerCase() === email)?.name ||
    email.split('@')[0];

  function addTarget(raw: string) {
    const e = raw.trim().toLowerCase();
    if (!e || !e.includes('@')) return;
    if (e === effectiveSource) { setMsg({ kind: 'err', text: 'Ese asesor es el origen.' }); return; }
    setTargets((prev) => (prev.includes(e) ? prev : [...prev, e]));
    setTargetInput('');
  }
  function removeTarget(e: string) {
    setTargets((prev) => prev.filter((x) => x !== e));
  }

  // Reparto PAREJO (round-robin 1-a-1): diferencia máx. de 1 lead entre asesores.
  function splitEven(ids: string[], emails: string[]): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    emails.forEach((e) => (out[e] = []));
    ids.forEach((id, i) => out[emails[i % emails.length]].push(id));
    return out;
  }

  async function loadLeads(ownerOverride?: string) {
    const owner = (ownerOverride ?? effectiveSource).trim().toLowerCase();
    if (!owner) return;
    setLoading(true);
    setMsg(null);
    setLeads(null);
    setSelected(new Set());
    setStatusFilter('');
    setCandidates([]);
    try {
      const res = await fetch(`/api/zoho/my-leads?owner=${encodeURIComponent(owner)}`);
      const data = await res.json();
      // 409 = nombre ambiguo (varios tocayos) → mostramos candidatos para elegir.
      if (res.status === 409 && Array.isArray(data.candidates)) {
        setCandidates(data.candidates);
        setMsg({ kind: 'err', text: data.error || 'Varios asesores coinciden — elige uno abajo.' });
        return;
      }
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

  // Descarga la cartera visible a Excel (CSV). Si hay seleccionados, exporta solo esos.
  function exportCartera() {
    const rows = visible.filter((l) => selected.size === 0 || selected.has(l.id));
    if (rows.length === 0) return;
    downloadCSV(
      `cartera-${effectiveSource || 'leads'}.csv`,
      ['Lead#', 'Cliente', 'Telefono', 'Estado', 'Lead Owner', 'Consultor', 'Creado', 'Cita', 'Zoho URL'],
      rows.map((l) => [
        l.leadNumber || '', l.fullName, l.phone || '', l.status || '', l.owner || '', l.consultor || '',
        l.createdAt ? l.createdAt.slice(0, 10) : '', l.appointmentAt ? l.appointmentAt.slice(0, 10) : '', l.zohoUrl,
      ])
    );
  }

  // Reparte los leads seleccionados EQUITATIVAMENTE entre los asesores destino.
  // Una llamada a /api/zoho/assign por asesor con su tajada (cada una auditada).
  async function distribute() {
    if (targets.length === 0 || selected.size === 0) return;
    const plan = splitEven(Array.from(selected), targets);
    const byId = new Map<string, Lead>((leads ?? []).map((l) => [l.id, l] as [string, Lead]));
    setBusy(true);
    setMsg(null);
    let ok = 0, fail = 0;
    const done = new Set<string>();
    try {
      for (const email of targets) {
        const slice = plan[email];
        if (!slice.length) continue;
        try {
          const res = await fetch('/api/zoho/assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              leadIds: slice,
              ownerEmail: email,
              fromOwner: effectiveSource,
              leads: slice.map((id) => { const l = byId.get(id); return { num: l?.leadNumber ?? null, name: l?.fullName ?? null, url: l?.zohoUrl ?? null }; }),
            }),
          });
          const data = await res.json();
          if (res.ok) { ok += data.success ?? slice.length; slice.forEach((id) => done.add(id)); }
          else { fail += slice.length; }
        } catch { fail += slice.length; }
      }
      setMsg({
        kind: fail === 0 ? 'ok' : 'err',
        text: `Repartidos ${ok} leads entre ${targets.length} asesor(es)${fail ? ` · ${fail} fallaron` : ''}.`,
      });
      setLeads((prev) => (prev ? prev.filter((l) => !done.has(l.id)) : prev));
      setSelected(new Set());
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

      {/* Datalists: por correo (destinos) y por nombre (origen) */}
      <datalist id="zoho-users-list">
        {zohoUsers.map((u) => (
          <option key={u.email} value={u.email}>{u.name}</option>
        ))}
      </datalist>
      <datalist id="zoho-names-list">
        {zohoUsers.map((u) => (
          <option key={u.email} value={u.name}>{u.email}</option>
        ))}
      </datalist>

      {/* Origen — combobox buscable (clic despliega la lista de owners) */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <span style={{ color: 'var(--text2)', fontSize: 13 }}>Ver leads del owner:</span>
        <OwnerSelect
          users={zohoUsers}
          value={manualSource.includes('@') ? manualSource : ''}
          loading={loading}
          onPick={(email) => { setManualSource(email); setCandidates([]); loadLeads(email); }}
        />
        <button onClick={() => loadLeads()} disabled={!effectiveSource || loading} style={btn('#38bdf8', !effectiveSource || loading)}>
          {loading ? 'Cargando…' : 'Recargar'}
        </button>
      </div>

      {/* Desambiguación: varios asesores coinciden con el nombre → elige uno */}
      {candidates.length > 0 && (
        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(247,148,29,0.08)', border: '1px solid rgba(247,148,29,0.4)' }}>
          <div style={{ color: 'var(--text2)', fontSize: 12, marginBottom: 8 }}>Coinciden varios — elige el owner:</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {candidates.map((c) => (
              <button
                key={c.email}
                onClick={() => { setManualSource(c.email); loadLeads(c.email); }}
                style={{ fontSize: 12, padding: '5px 11px', borderRadius: 999, cursor: 'pointer', border: '1px solid rgba(56,189,248,0.45)', background: 'rgba(56,189,248,0.12)', color: '#bfe6ff' }}
                title={c.email}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

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
                <button
                  onClick={exportCartera}
                  disabled={visible.length === 0}
                  style={{ fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: 8, cursor: 'pointer', border: '1px solid rgba(34,197,94,0.5)', background: 'rgba(34,197,94,0.12)', color: '#22c55e', marginLeft: 'auto' }}
                  title={selected.size > 0 ? `Descargar ${selected.size} seleccionados a Excel` : 'Descargar la cartera visible a Excel'}
                >
                  ⬇ Excel {selected.size > 0 ? `(${selected.size})` : ''}
                </button>
                <span style={{ color: 'var(--text2)', fontSize: 12 }}>Filtrar estado:</span>
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

              {/* Panel de reparto equitativo entre varios asesores */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--glass-border)' }}>
                <div style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 8 }}>
                  Repartir <b style={{ color: '#F7941D' }}>{selected.size}</b> leads en partes iguales entre los asesores:
                </div>

                {/* Agregar asesores destino (escrito, con autocompletado) */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                  <input
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTarget(targetInput); } }}
                    list="zoho-users-list"
                    placeholder="correo del asesor destino + Enter"
                    style={{ ...selectStyle, minWidth: 300 }}
                  />
                  <button onClick={() => addTarget(targetInput)} disabled={!targetInput.trim()} style={btn('#38bdf8', !targetInput.trim())}>
                    + Agregar
                  </button>
                </div>

                {/* Chips de asesores elegidos */}
                {targets.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {targets.map((e) => (
                      <span key={e} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '4px 10px', borderRadius: 999, background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.4)', color: '#bfe6ff' }}>
                        {nameOf(e)}
                        <button onClick={() => removeTarget(e)} style={{ background: 'none', border: 'none', color: '#7dd3fc', cursor: 'pointer', fontWeight: 700, lineHeight: 1 }} aria-label={`Quitar ${e}`}>×</button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Preview del reparto */}
                {targets.length > 0 && selected.size > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                    <span style={{ color: 'var(--text3)' }}>Vista previa: </span>
                    {Object.entries(splitEven(Array.from(selected), targets)).map(([e, ids], i) => (
                      <span key={e}>{i > 0 ? ' · ' : ''}<b style={{ color: 'var(--text1)' }}>{nameOf(e)}</b>: {ids.length}</span>
                    ))}
                  </div>
                )}

                <button
                  onClick={distribute}
                  disabled={busy || targets.length === 0 || selected.size === 0}
                  style={btn('#F7941D', busy || targets.length === 0 || selected.size === 0)}
                >
                  {busy ? 'Repartiendo…' : `Repartir ${selected.size} entre ${targets.length || 0} asesor(es)`}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
