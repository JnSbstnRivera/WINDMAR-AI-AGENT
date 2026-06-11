import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ACTION_LABEL: Record<string, string> = {
  'zoho.assign': 'Asignó leads',
  'zoho.note': 'Escribió nota',
  'access.approve': 'Aprobó acceso',
  'access.reject': 'Rechazó acceso',
};

function fmt(iso: string): string {
  // Hora local Puerto Rico (UTC-4)
  const d = new Date(iso);
  return d.toLocaleString('es-PR', { timeZone: 'America/Puerto_Rico', dateStyle: 'short', timeStyle: 'short' });
}

/**
 * /admin/auditoria — Registro de acciones sensibles (admin_audit).
 * Solo admins (gate en layout). Append-only, lectura.
 */
export default async function AdminAuditPage() {
  const { data } = await getSupabaseAdmin()
    .from('admin_audit')
    .select('created_at, actor_email, action, target, detail')
    .order('created_at', { ascending: false })
    .limit(200);

  const rows = data || [];

  return (
    <div style={{ marginTop: 8 }}>
      <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--text1)', margin: '0 0 4px' }}>
        Auditoría
      </h1>
      <p style={{ color: 'var(--text2)', fontSize: 13, margin: '0 0 20px' }}>
        Últimas {rows.length} acciones sensibles (asignaciones, notas, accesos). Registro inalterable.
      </p>

      {rows.length === 0 ? (
        <div style={{ color: 'var(--text2)', fontSize: 13 }}>Aún no hay acciones registradas.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map((r, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '9px 13px',
                borderRadius: 10, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                fontSize: 13, flexWrap: 'wrap',
              }}
            >
              <span style={{ color: 'var(--text3)', fontSize: 11, minWidth: 110 }}>{fmt(r.created_at)}</span>
              <span style={{ color: '#F7941D', fontWeight: 600 }}>{r.actor_email}</span>
              <span style={{ color: 'var(--text1)' }}>{ACTION_LABEL[r.action] || r.action}</span>
              {r.target && <span style={{ color: 'var(--text2)' }}>→ {r.target}</span>}
              {r.detail && (
                <span style={{ color: 'var(--text3)', fontSize: 11 }}>
                  {Object.entries(r.detail as Record<string, unknown>)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(' · ')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
