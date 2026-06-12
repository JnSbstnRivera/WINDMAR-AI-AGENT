import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { invalidateZohoMapsCache } from '@/lib/zoho-config';
import { BUCKET_LABEL } from '@/lib/zoho-status';

export const runtime = 'nodejs';
export const maxDuration = 15;

const BUCKETS = Object.keys(BUCKET_LABEL); // los 8 buckets válidos
const STATES = ['ganado', 'abierto', 'perdido'] as const;

/**
 * GET /api/admin/zoho/config
 * Devuelve los mapeos editables (status→bucket, stage→estado) + los valores
 * permitidos para los selects del editor. Solo admins.
 */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!isAdmin(email)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  try {
    const sb = getSupabaseAdmin();
    const [statusRes, stageRes] = await Promise.all([
      sb.from('zoho_status_map').select('status,bucket,sort,updated_at,updated_by').order('sort'),
      sb.from('zoho_deal_stage_map').select('stage,state,completed,sort,updated_at,updated_by').order('sort'),
    ]);
    return NextResponse.json({
      statusMap: statusRes.data ?? [],
      dealStageMap: stageRes.data ?? [],
      buckets: BUCKETS,
      bucketLabels: BUCKET_LABEL,
      states: STATES,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error consultando Supabase';
    console.error('[admin/zoho/config GET]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

/**
 * POST /api/admin/zoho/config
 * Body: { statusMap?: [{status,bucket}], dealStageMap?: [{stage,state,completed}] }
 * Hace upsert de los cambios, sella updated_by/updated_at e invalida el cache.
 */
export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!isAdmin(email)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  let body: {
    statusMap?: Array<{ status: string; bucket: string }>;
    dealStageMap?: Array<{ stage: string; state: string; completed?: boolean }>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  // Validación server-side (además del CHECK en la DB)
  const badBucket = (body.statusMap ?? []).find((r) => !BUCKETS.includes(r.bucket));
  if (badBucket) return NextResponse.json({ error: `Bucket inválido: ${badBucket.bucket}` }, { status: 400 });
  const badState = (body.dealStageMap ?? []).find((r) => !STATES.includes(r.state as (typeof STATES)[number]));
  if (badState) return NextResponse.json({ error: `Estado inválido: ${badState.state}` }, { status: 400 });

  try {
    const sb = getSupabaseAdmin();
    const now = new Date().toISOString();
    const ops: Promise<unknown>[] = [];

    if (body.statusMap?.length) {
      ops.push(
        Promise.resolve(
          sb.from('zoho_status_map').upsert(
            body.statusMap.map((r) => ({ status: r.status, bucket: r.bucket, updated_at: now, updated_by: email })),
            { onConflict: 'status' }
          )
        )
      );
    }
    if (body.dealStageMap?.length) {
      ops.push(
        Promise.resolve(
          sb.from('zoho_deal_stage_map').upsert(
            body.dealStageMap.map((r) => ({
              stage: r.stage,
              state: r.state,
              completed: r.completed ?? false,
              updated_at: now,
              updated_by: email,
            })),
            { onConflict: 'stage' }
          )
        )
      );
    }

    await Promise.all(ops);
    invalidateZohoMapsCache(); // los próximos requests leen la config nueva
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error guardando en Supabase';
    console.error('[admin/zoho/config POST]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
