import { getSupabaseAdmin } from '@/lib/supabase';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

// Forzamos render dinámico — siempre datos frescos al cargar
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Period = 'today' | 'week' | 'month' | 'all';

async function loadMetrics(period: Period) {
  const supabase = getSupabaseAdmin();

  // 7 queries en paralelo para minimizar latencia.
  // NOTA: admin_top_keywords y admin_week_comparison existen en DB pero ya no
  // se llaman desde aquí (componentes removidos del dashboard por preferencia).
  const [
    kpisRes, usageRes, topRes, downvotesRes, convsRes,
    deptsRes, hourlyRes,
  ] = await Promise.all([
    supabase.rpc('admin_metrics_kpis', { period }),
    supabase.rpc('admin_usage_by_day'),
    supabase.rpc('admin_top_asesores', { period, max_rows: 7 }),
    supabase.rpc('admin_recent_downvotes', { max_rows: 20 }),
    supabase.rpc('admin_recent_conversations', { max_rows: 30 }),
    supabase.rpc('admin_messages_by_dept', { period }),
    supabase.rpc('admin_usage_by_hour', { period: 'all' }),
  ]);

  return {
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
  };
}

export default async function AdminPage() {
  // Default: vista "Todo" para mostrar el panorama completo histórico al abrir.
  // El admin puede filtrar a Hoy / 7 días / 30 días desde la toolbar superior.
  const initialPeriod: Period = 'all';
  const initial = await loadMetrics(initialPeriod);

  return <AdminDashboard initialPeriod={initialPeriod} initial={initial} />;
}
