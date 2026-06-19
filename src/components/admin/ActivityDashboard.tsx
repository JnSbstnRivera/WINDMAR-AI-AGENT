'use client';

import { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { downloadCSV } from '@/lib/csv';

export interface AssignEvent {
  createdAt: string;
  admin: string;          // actor_email (quién asignó)
  target: string | null;  // a quién (asesor destino, owner nuevo)
  count: number;          // cuántos leads
  success: number | null;
  failed: number | null;
  fromOwner: string | null;                                       // de quién era (owner anterior)
  leads: Array<{ num: string | null; name: string | null; url: string | null }> | null; // qué leads (+ enlace Zoho)
}

const PR = 'America/Puerto_Rico';
const dayPR = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: PR, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-PR', { timeZone: PR, dateStyle: 'short', timeStyle: 'short' });
const shortName = (email: string | null) => (email ? email.split('@')[0] : '—');

type Range = '7d' | '30d' | 'all';

export function ActivityDashboard({ events }: { events: AssignEvent[] }) {
  const [admin, setAdmin] = useState<'all' | string>('all');
  const [range, setRange] = useState<Range>('30d');

  const admins = useMemo(() => Array.from(new Set(events.map((e) => e.admin))).sort(), [events]);

  const filtered = useMemo(() => {
    const cutoff = range === 'all' ? 0 : Date.now() - (range === '7d' ? 7 : 30) * 86400000;
    return events.filter(
      (e) => (admin === 'all' || e.admin === admin) && (range === 'all' || new Date(e.createdAt).getTime() >= cutoff)
    );
  }, [events, admin, range]);

  const totalLeads = filtered.reduce((s, e) => s + e.count, 0);
  const totalEvents = filtered.length;
  const recipients = new Set(filtered.map((e) => e.target).filter(Boolean)).size;
  const activeAdmins = new Set(filtered.map((e) => e.admin)).size;

  const byAdmin = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((e) => m.set(e.admin, (m.get(e.admin) || 0) + e.count));
    return Array.from(m, ([k, v]) => ({ name: shortName(k), value: v })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const byDay = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((e) => { const d = dayPR(e.createdAt); m.set(d, (m.get(d) || 0) + e.count); });
    return Array.from(m, ([d, v]) => ({ day: d.slice(5), value: v })).sort((a, b) => a.day.localeCompare(b.day)).slice(-14);
  }, [filtered]);

  const byTarget = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((e) => { if (e.target) m.set(e.target, (m.get(e.target) || 0) + e.count); });
    return Array.from(m, ([k, v]) => ({ name: shortName(k), value: v })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filtered]);

  const flat = useMemo(
    () => [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 300),
    [filtered]
  );

  // Una fila por LEAD movido (sin expandir). Las asignaciones viejas sin detalle
  // aparecen como una fila con lead vacío.
  const flatLeads = useMemo(() => {
    const out: Array<{ e: AssignEvent; l: { num: string | null; name: string | null; url: string | null } | null }> = [];
    for (const e of flat) {
      if (e.leads && e.leads.length) e.leads.forEach((l) => out.push({ e, l }));
      else out.push({ e, l: null });
    }
    return out.slice(0, 600);
  }, [flat]);

  const stamp = () => fmtDateTime(new Date().toISOString()).replace(/[/:, ]/g, '-');
  const sufijo = `${admin === 'all' ? 'todos' : shortName(admin)}-${range}`;

  // Export 1: una fila por asignación.
  function exportResumen() {
    downloadCSV(
      `actividad-resumen-${sufijo}.csv`,
      ['Fecha', 'Admin', 'De quién', 'A quién', 'Leads', 'Fallos'],
      flat.map((e) => [fmtDateTime(e.createdAt), e.admin, e.fromOwner || '', e.target || '', e.count, e.failed || 0])
    );
  }
  // Export 2: una fila por LEAD movido (para control de líderes).
  function exportPorLead() {
    const rows: Array<Array<string | number | null>> = [];
    flat.forEach((e) => {
      if (e.leads && e.leads.length) {
        e.leads.forEach((l) => rows.push([fmtDateTime(e.createdAt), e.admin, e.fromOwner || '', e.target || '', l.num || '', l.name || '', l.url || '']));
      } else {
        rows.push([fmtDateTime(e.createdAt), e.admin, e.fromOwner || '', e.target || '', '', '(sin detalle de leads)', '']);
      }
    });
    downloadCSV(`actividad-por-lead-${sufijo}.csv`, ['Fecha', 'Admin', 'De quién', 'A quién', 'Lead#', 'Cliente', 'Zoho URL'], rows);
  }

  const xlsBtn: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
    border: '1px solid rgba(34,197,94,0.5)', background: 'rgba(34,197,94,0.12)', color: '#22c55e', whiteSpace: 'nowrap',
  };

  const card: React.CSSProperties = { background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: 14 };
  const kpi: React.CSSProperties = { ...card, display: 'flex', flexDirection: 'column', gap: 2 };
  const BLUE = '#38bdf8'; const ORANGE = '#F7941D';

  return (
    <div style={{ marginTop: 8 }}>
      <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 600, color: 'var(--text1)', margin: '0 0 4px' }}>
        Actividad de admins
      </h1>
      <p style={{ color: 'var(--text2)', fontSize: 13, margin: '0 0 16px' }}>
        Quién asignó leads, a quién y cuándo. Datos del registro de auditoría (inalterable).
      </p>

      {/* Controles */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <span style={{ color: 'var(--text2)', fontSize: 13 }}>Admin:</span>
        <select
          value={admin}
          onChange={(e) => setAdmin(e.target.value)}
          style={{ background: '#0f1525', color: '#E8EAF0', border: '1px solid var(--glass-border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, minWidth: 220 }}
        >
          <option value="all">Todos los admins</option>
          {admins.map((a) => (
            <option key={a} value={a} style={{ background: '#0f1525' }}>{a}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {(['7d', '30d', 'all'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                fontSize: 12, padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${range === r ? ORANGE : 'var(--glass-border)'}`,
                background: range === r ? ORANGE : 'transparent',
                color: range === r ? '#0c1322' : 'var(--text2)', fontWeight: range === r ? 700 : 400,
              }}
            >{r === '7d' ? '7 días' : r === '30d' ? '30 días' : 'Todo'}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 18 }}>
        <div style={kpi}><span style={{ color: 'var(--text3)', fontSize: 12 }}>Leads asignados</span><span style={{ color: ORANGE, fontSize: 26, fontWeight: 600 }}>{totalLeads}</span></div>
        <div style={kpi}><span style={{ color: 'var(--text3)', fontSize: 12 }}>Asignaciones</span><span style={{ color: 'var(--text1)', fontSize: 26, fontWeight: 600 }}>{totalEvents}</span></div>
        <div style={kpi}><span style={{ color: 'var(--text3)', fontSize: 12 }}>Asesores receptores</span><span style={{ color: BLUE, fontSize: 26, fontWeight: 600 }}>{recipients}</span></div>
        <div style={kpi}><span style={{ color: 'var(--text3)', fontSize: 12 }}>Admins activos</span><span style={{ color: 'var(--text1)', fontSize: 26, fontWeight: 600 }}>{activeAdmins}</span></div>
      </div>

      {/* Gráficas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginBottom: 18 }}>
        <div style={card}>
          <div style={{ color: 'var(--text1)', fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Leads asignados por admin</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byAdmin} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={90} />
              <Tooltip contentStyle={{ background: '#0f1525', border: '1px solid #ffffff22', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} fill={ORANGE} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={card}>
          <div style={{ color: 'var(--text1)', fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Leads asignados por día</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byDay} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} width={28} />
              <Tooltip contentStyle={{ background: '#0f1525', border: '1px solid #ffffff22', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} fill={BLUE} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={card}>
          <div style={{ color: 'var(--text1)', fontSize: 14, fontWeight: 600, marginBottom: 10 }}>A quién se le asignó (top 10)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byTarget} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={90} />
              <Tooltip contentStyle={{ background: '#0f1525', border: '1px solid #ffffff22', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {byTarget.map((_, i) => (<Cell key={i} fill={i % 2 ? BLUE : ORANGE} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla plana */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ color: 'var(--text1)', fontSize: 14, fontWeight: 600 }}>
            Detalle por lead ({flatLeads.length}) — fecha · admin · de quién → a quién · lead · Zoho
          </div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button onClick={exportResumen} disabled={flat.length === 0} style={{ ...xlsBtn, opacity: flat.length === 0 ? 0.5 : 1 }} title="Descargar resumen (una fila por asignación)">
              ⬇ Excel resumen
            </button>
            <button onClick={exportPorLead} disabled={flat.length === 0} style={{ ...xlsBtn, opacity: flat.length === 0 ? 0.5 : 1 }} title="Descargar detalle (una fila por lead movido)">
              ⬇ Excel por lead
            </button>
          </div>
        </div>
        <div style={{ maxHeight: 480, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '130px 120px 1.2fr 96px 1.2fr 70px', gap: 8, padding: '6px 10px', position: 'sticky', top: 0, background: '#0f1525', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: ORANGE, fontWeight: 600, borderBottom: '1px solid var(--glass-border)' }}>
            <span>Fecha</span><span>Admin</span><span>De quién → A quién</span><span>Lead#</span><span>Cliente</span><span style={{ textAlign: 'right' }}>Zoho</span>
          </div>
          {flatLeads.length === 0 ? (
            <div style={{ color: 'var(--text2)', fontSize: 13, padding: 14 }}>Sin asignaciones en este periodo.</div>
          ) : flatLeads.map(({ e, l }, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '130px 120px 1.2fr 96px 1.2fr 70px', gap: 8, padding: '7px 10px', alignItems: 'center', fontSize: 12.5, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'var(--text3)', fontSize: 11 }}>{fmtDateTime(e.createdAt)}</span>
              <span style={{ color: '#F7941D', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.admin}>{shortName(e.admin)}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${e.fromOwner || '—'} → ${e.target || '—'}`}>
                <span style={{ color: 'var(--text3)' }}>{shortName(e.fromOwner)}</span>
                <span style={{ color: 'var(--text3)' }}> → </span>
                <span style={{ color: 'var(--text1)', fontWeight: 600 }}>{shortName(e.target)}</span>
              </span>
              <span style={{ color: BLUE, fontWeight: 600 }}>{l?.num || '—'}</span>
              <span style={{ color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l?.name || ''}>{l?.name || '—'}</span>
              <span style={{ textAlign: 'right' }}>
                {l?.url
                  ? <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ color: ORANGE, fontSize: 11.5, fontWeight: 600, textDecoration: 'none' }}>Zoho ↗</a>
                  : <span style={{ color: 'var(--text3)', fontSize: 11 }}>—</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
