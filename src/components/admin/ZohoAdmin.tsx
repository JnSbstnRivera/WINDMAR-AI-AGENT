'use client';

import { useState } from 'react';

// ── Tipos (espejo de lo que devuelve la API/RPC) ──
type StatusRow = { status: string; bucket: string; sort: number; updated_at?: string; updated_by?: string | null };
type StageRow = { stage: string; state: string; completed: boolean; sort: number; updated_at?: string; updated_by?: string | null };
type ByTool = { tool: string | null; calls: number; errors: number; avg_ms: number };
type ByDay = { day: string; calls: number; errors: number };
type RecentError = { at: string; tool: string | null; error: string | null; user_email: string | null };
export type ZohoHealth = {
  days: number; total: number; errors: number; errorRatePct: number;
  avgMs: number; p50Ms: number; p95Ms: number;
  byTool: ByTool[]; byDay: ByDay[]; recentErrors: RecentError[];
};

const STATES = ['ganado', 'abierto', 'perdido'] as const;
const STATE_COLOR: Record<string, string> = { ganado: '#22c55e', abierto: '#38bdf8', perdido: '#ef4444' };

const card: React.CSSProperties = {
  background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
  borderRadius: 14, padding: '18px 20px',
};
const label: React.CSSProperties = { fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text3)' };
const selectStyle: React.CSSProperties = {
  background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text1)',
  borderRadius: 8, padding: '4px 8px', fontSize: 13,
};

export function ZohoAdmin({
  initialStatusMap, initialStageMap, initialHealth, buckets, bucketLabels,
}: {
  initialStatusMap: StatusRow[];
  initialStageMap: StageRow[];
  initialHealth: ZohoHealth | null;
  buckets: string[];
  bucketLabels: Record<string, string>;
}) {
  const [tab, setTab] = useState<'mapeos' | 'salud'>('mapeos');
  const [statusMap, setStatusMap] = useState<StatusRow[]>(initialStatusMap);
  const [stageMap, setStageMap] = useState<StageRow[]>(initialStageMap);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [health, setHealth] = useState<ZohoHealth | null>(initialHealth);
  const [days, setDays] = useState(7);
  const [loadingHealth, setLoadingHealth] = useState(false);

  function setStatusBucket(status: string, bucket: string) {
    setStatusMap((rows) => rows.map((r) => (r.status === status ? { ...r, bucket } : r)));
    setDirty(true);
  }
  function setStageState(stage: string, state: string) {
    setStageMap((rows) => rows.map((r) => (r.stage === stage ? { ...r, state } : r)));
    setDirty(true);
  }
  function setStageCompleted(stage: string, completed: boolean) {
    setStageMap((rows) => rows.map((r) => (r.stage === stage ? { ...r, completed } : r)));
    setDirty(true);
  }

  async function save() {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/admin/zoho/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statusMap: statusMap.map((r) => ({ status: r.status, bucket: r.bucket })),
          dealStageMap: stageMap.map((r) => ({ stage: r.stage, state: r.state, completed: r.completed })),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error guardando');
      setDirty(false);
      setMsg('✅ Guardado. Los cambios aplican en máx. 5 min (cache del agente).');
    } catch (e) {
      setMsg('❌ ' + (e instanceof Error ? e.message : 'Error'));
    } finally {
      setSaving(false);
    }
  }

  async function reloadHealth(d: number) {
    setLoadingHealth(true); setDays(d);
    try {
      const res = await fetch(`/api/admin/zoho/health?days=${d}`);
      const j = await res.json();
      if (res.ok) setHealth(j);
    } finally {
      setLoadingHealth(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header + tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 30, letterSpacing: '0.04em', color: 'var(--text1)' }}>
            CONFIGURACIÓN ZOHO
          </h1>
          <p style={{ ...label, marginTop: -4 }}>Controla cómo el agente interpreta y consulta Zoho</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['mapeos', 'salud'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                ...selectStyle, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 11,
                borderColor: tab === t ? '#F7941D' : 'var(--glass-border)',
                color: tab === t ? '#F7941D' : 'var(--text2)',
              }}
            >
              {t === 'mapeos' ? '⚙ Mapeos' : '📡 Salud'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'mapeos' ? (
        <>
          {/* Editor: Lead_Status → bucket */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ color: '#F7941D', fontWeight: 700, fontSize: 15 }}>Estados de Lead → grupo</div>
                <div style={{ ...label, textTransform: 'none', letterSpacing: 0 }}>
                  Define en qué grupo cae cada estado de Zoho (ej. cuáles cuentan como “Seguimiento”).
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 8 }}>
              {statusMap.map((r) => (
                <div key={r.status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                  <span style={{ color: 'var(--text1)', fontSize: 13 }}>{r.status}</span>
                  <select value={r.bucket} onChange={(e) => setStatusBucket(r.status, e.target.value)} style={selectStyle}>
                    {buckets.map((b) => <option key={b} value={b}>{bucketLabels[b] || b}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Editor: Deal Stage → estado */}
          <div style={card}>
            <div style={{ color: '#F7941D', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Etapas de Deal → estado de venta</div>
            <div style={{ ...label, textTransform: 'none', letterSpacing: 0, marginBottom: 12 }}>
              En Windmar un Deal = contrato firmado. Marca <b>completado</b> si el sistema ya está energizado.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {stageMap.map((r) => (
                <div key={r.stage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text1)', fontSize: 13, flex: 1, minWidth: 160 }}>{r.stage}</span>
                  <select value={r.state} onChange={(e) => setStageState(r.stage, e.target.value)} style={{ ...selectStyle, color: STATE_COLOR[r.state] || 'var(--text1)' }}>
                    {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={r.completed} onChange={(e) => setStageCompleted(r.stage, e.target.checked)} />
                    completado
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Save bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={save}
              disabled={!dirty || saving}
              style={{
                background: dirty ? '#F7941D' : 'var(--glass-bg)', color: dirty ? '#1B3A5C' : 'var(--text3)',
                border: '1px solid ' + (dirty ? '#F7941D' : 'var(--glass-border)'),
                borderRadius: 10, padding: '9px 20px', fontWeight: 700, fontSize: 13,
                cursor: dirty && !saving ? 'pointer' : 'default',
              }}
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
            {msg && <span style={{ fontSize: 13, color: 'var(--text2)' }}>{msg}</span>}
          </div>
        </>
      ) : (
        <HealthPanel health={health} days={days} loading={loadingHealth} onDays={reloadHealth} />
      )}
    </div>
  );
}

function Kpi({ label: l, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ ...card, flex: 1, minWidth: 130 }}>
      <div style={label}>{l}</div>
      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 34, color: color || 'var(--text1)', lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

function HealthPanel({ health, days, loading, onDays }: { health: ZohoHealth | null; days: number; loading: boolean; onDays: (d: number) => void }) {
  if (!health) return <div style={card}>Sin datos de salud todavía.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {[1, 7, 30].map((d) => (
          <button key={d} onClick={() => onDays(d)} style={{ ...selectStyle, cursor: 'pointer', borderColor: days === d ? '#F7941D' : 'var(--glass-border)', color: days === d ? '#F7941D' : 'var(--text2)' }}>
            {d === 1 ? 'Hoy' : `${d} días`}
          </button>
        ))}
        {loading && <span style={{ fontSize: 12, color: 'var(--text3)' }}>cargando…</span>}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Kpi label="Consultas" value={String(health.total)} />
        <Kpi label="Errores" value={String(health.errors)} color={health.errors > 0 ? '#ef4444' : undefined} />
        <Kpi label="% Error" value={`${health.errorRatePct}%`} color={health.errorRatePct > 5 ? '#ef4444' : '#22c55e'} />
        <Kpi label="Latencia p50" value={`${health.p50Ms}ms`} />
        <Kpi label="Latencia p95" value={`${health.p95Ms}ms`} color={health.p95Ms > 8000 ? '#ef4444' : undefined} />
      </div>

      <div style={card}>
        <div style={{ ...label, marginBottom: 10 }}>Por herramienta</div>
        {health.byTool.length === 0 ? (
          <div style={{ color: 'var(--text3)', fontSize: 13 }}>Sin consultas en el período.</div>
        ) : (
          <table style={{ width: '100%', fontSize: 13, color: 'var(--text1)', borderCollapse: 'collapse' }}>
            <thead><tr style={{ color: 'var(--text3)', textAlign: 'left', fontSize: 11 }}>
              <th style={{ padding: '4px 0' }}>Herramienta</th><th>Llamadas</th><th>Errores</th><th>Prom. ms</th>
            </tr></thead>
            <tbody>
              {health.byTool.map((t) => (
                <tr key={t.tool ?? '—'} style={{ borderTop: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '5px 0' }}>{t.tool ?? '—'}</td>
                  <td>{t.calls}</td>
                  <td style={{ color: t.errors > 0 ? '#ef4444' : 'var(--text2)' }}>{t.errors}</td>
                  <td>{t.avg_ms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {health.recentErrors.length > 0 && (
        <div style={card}>
          <div style={{ ...label, marginBottom: 10, color: '#ef4444' }}>Errores recientes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {health.recentErrors.map((e, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--text2)', padding: '6px 8px', background: 'rgba(239,68,68,0.08)', borderRadius: 6 }}>
                <span style={{ color: 'var(--text3)' }}>{e.at}</span> · <b>{e.tool ?? '—'}</b>
                {e.user_email ? ` · ${e.user_email}` : ''} — <span style={{ color: '#fca5a5' }}>{e.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
