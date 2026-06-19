import { getSupabaseAdmin } from '@/lib/supabase';
import { ActivityDashboard, type AssignEvent } from '@/components/admin/ActivityDashboard';

// Datos frescos siempre (la actividad cambia).
export const dynamic = 'force-dynamic';

/**
 * /admin/actividad — Dashboard de actividad de admins (solo admins; gate en layout).
 * Lee admin_audit filtrado a 'zoho.assign' y muestra KPIs + gráficas + tabla plana
 * de quién asignó leads, a quién y cuándo. Control de la operación de distribución.
 */
export default async function AdminActivityPage() {
  const { data } = await getSupabaseAdmin()
    .from('admin_audit')
    .select('created_at, actor_email, target, detail')
    .eq('action', 'zoho.assign')
    .order('created_at', { ascending: false })
    .limit(2000);

  const events: AssignEvent[] = (data || []).map((r) => {
    const d = (r.detail || {}) as {
      count?: number; success?: number; failed?: number;
      fromOwner?: string | null; leads?: Array<{ num?: string | null; name?: string | null }>;
    };
    return {
      createdAt: r.created_at,
      admin: r.actor_email,
      target: r.target,
      count: typeof d.count === 'number' ? d.count : typeof d.success === 'number' ? d.success : 0,
      success: typeof d.success === 'number' ? d.success : null,
      failed: typeof d.failed === 'number' ? d.failed : null,
      fromOwner: d.fromOwner ?? null,
      leads: Array.isArray(d.leads) ? d.leads.map((l) => ({ num: l.num ?? null, name: l.name ?? null })) : null,
    };
  });

  return <ActivityDashboard events={events} />;
}
