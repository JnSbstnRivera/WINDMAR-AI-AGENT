import { getSupabaseAdmin } from '@/lib/supabase';
import { BUCKET_LABEL } from '@/lib/zoho-status';
import { ZohoAdmin } from '@/components/admin/ZohoAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// El acceso ya está gateado por /admin/layout.tsx (isAdmin server-side).
export default async function ZohoConfigPage() {
  const sb = getSupabaseAdmin();
  const [statusRes, stageRes, healthRes] = await Promise.all([
    sb.from('zoho_status_map').select('status,bucket,sort,updated_at,updated_by').order('sort'),
    sb.from('zoho_deal_stage_map').select('stage,state,completed,sort,updated_at,updated_by').order('sort'),
    sb.rpc('admin_zoho_health', { p_days: 7 }),
  ]);

  return (
    <ZohoAdmin
      initialStatusMap={statusRes.data ?? []}
      initialStageMap={stageRes.data ?? []}
      initialHealth={healthRes.data ?? null}
      buckets={Object.keys(BUCKET_LABEL)}
      bucketLabels={BUCKET_LABEL}
    />
  );
}
