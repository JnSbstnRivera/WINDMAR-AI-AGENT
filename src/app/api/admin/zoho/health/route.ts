import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 15;

/**
 * GET /api/admin/zoho/health?days=7
 * Stats de salud de las llamadas a Zoho (latencia p50/p95, error rate, por
 * herramienta/día, errores recientes). Solo admins.
 */
export async function GET(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!isAdmin(email)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const days = Math.min(Math.max(Number(new URL(req.url).searchParams.get('days')) || 7, 1), 90);

  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb.rpc('admin_zoho_health', { p_days: days });
    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error consultando salud de Zoho';
    console.error('[admin/zoho/health]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
