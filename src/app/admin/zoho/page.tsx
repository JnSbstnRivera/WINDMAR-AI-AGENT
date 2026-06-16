import { getSupabaseAdmin } from '@/lib/supabase';
import { BUCKET_LABEL, VALID_LEAD_STATUSES } from '@/lib/zoho-status';
import { ZohoAdmin } from '@/components/admin/ZohoAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// El acceso ya está gateado por /admin/layout.tsx (isAdmin server-side).
export default async function ZohoConfigPage() {
  const sb = getSupabaseAdmin();
  const [statusRes, stageRes, healthRes, tipRes] = await Promise.all([
    sb.from('zoho_status_map').select('status,bucket,sort,updated_at,updated_by').order('sort'),
    sb.from('zoho_deal_stage_map').select('stage,state,completed,sort,updated_at,updated_by').order('sort'),
    sb.rpc('admin_zoho_health', { p_days: 7 }),
    sb.from('zoho_tipificar_opciones').select('status,orden,activo').order('orden'),
  ]);

  return (
    <ZohoAdmin
      initialStatusMap={statusRes.data ?? []}
      initialStageMap={stageRes.data ?? []}
      initialHealth={healthRes.data ?? null}
      initialTipificar={(tipRes.data ?? []) as Array<{ status: string; orden: number; activo: boolean }>}
      buckets={Object.keys(BUCKET_LABEL)}
      bucketLabels={BUCKET_LABEL}
      allStatuses={VALID_LEAD_STATUSES}
    />
  );
}
