import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';

/**
 * GET /api/admin/metrics?period=today|week|month|all
 *
 * Devuelve JSON con todas las métricas del dashboard. Usado por el cliente
 * para cambiar período sin recargar y para auto-refresh cada 60 segundos.
 *
 * SEGURIDAD: doble check de allowlist (además del layout.tsx) — defense in depth.
 * Aunque alguien encuentre la URL, no recibe datos si no es admin.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: 'No autenticado' }, { status: 401 });
  }
  if (!isAdmin(session.user.email)) {
    return Response.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const periodRaw = searchParams.get('period') ?? 'today';
  const period: 'today' | 'week' | 'month' | 'all' =
    ['today', 'week', 'month', 'all'].includes(periodRaw)
      ? (periodRaw as 'today' | 'week' | 'month' | 'all')
      : 'today';

  const supabase = getSupabaseAdmin();

  const [
    kpisRes, usageRes, topRes, downvotesRes, convsRes,
    deptsRes, hourlyRes,
  ] = await Promise.all([
    supabase.rpc('admin_metrics_kpis', { period }),
    supabase.rpc('admin_usage_by_day'),
    supabase.rpc('admin_top_asesores', { period, max_rows: 10 }),
    supabase.rpc('admin_recent_downvotes', { max_rows: 20 }),
    supabase.rpc('admin_recent_conversations', { max_rows: 30 }),
    supabase.rpc('admin_messages_by_dept', { period }),
    supabase.rpc('admin_usage_by_hour', { period: 'all' }),
  ]);

  return Response.json({
    kpis: kpisRes.data ?? {
      totalMessages: 0,
      activeUsers: 0,
      totalConvs: 0,
      thumbsUp: 0,
      thumbsDown: 0,
      satisfactionPct: null,
    },
    usage: usageRes.data ?? [],
    topAsesores: topRes.data ?? [],
    downvotes: downvotesRes.data ?? [],
    conversations: convsRes.data ?? [],
    departments: deptsRes.data ?? [],
    hourly: hourlyRes.data ?? [],
  });
}
