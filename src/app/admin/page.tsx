import { getSupabaseAdmin } from '@/lib/supabase';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

// Forzamos render dinámico — siempre datos frescos al cargar
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Period = 'today' | 'week' | 'month' | 'all';

async function loadMetrics(period: Period) {
  const supabase = getSupabaseAdmin();

  // Ejecutamos las 4 queries en paralelo para minimizar latencia
  const [kpisRes, usageRes, topRes, downvotesRes] = await Promise.all([
    supabase.rpc('admin_metrics_kpis', { period }),
    supabase.rpc('admin_usage_by_day'),
    supabase.rpc('admin_top_asesores', { period, max_rows: 10 }),
    supabase.rpc('admin_recent_downvotes', { max_rows: 20 }),
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
  };
}

export default async function AdminPage() {
  // Default: vista "Hoy" para que abra rápido con datos relevantes
  const initialPeriod: Period = 'today';
  const initial = await loadMetrics(initialPeriod);

  return <AdminDashboard initialPeriod={initialPeriod} initial={initial} />;
}
