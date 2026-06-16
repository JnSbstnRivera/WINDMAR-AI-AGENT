import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { invalidateZohoMapsCache } from '@/lib/zoho-config';
import { VALID_LEAD_STATUSES } from '@/lib/zoho-status';

export const runtime = 'nodejs';
export const maxDuration = 15;

/**
 * POST /api/admin/zoho/tipificar
 * Body: { statuses: string[] }  — lista completa (en orden) de estados que
 * aparecen en el dropdown del cuadro de tipificación. Reemplaza la lista entera.
 * Cada valor debe ser un Lead_Status oficial. Solo admins.
 */
export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!isAdmin(email)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  let body: { statuses?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const statuses = Array.isArray(body.statuses) ? [...new Set(body.statuses.map((s) => s.trim()).filter(Boolean))] : null;
  if (!statuses) return NextResponse.json({ error: 'Falta la lista de estados' }, { status: 400 });
  const invalid = statuses.find((s) => !VALID_LEAD_STATUSES.includes(s));
  if (invalid) return NextResponse.json({ error: `Estado no válido: "${invalid}". Debe ser un Lead_Status oficial.` }, { status: 400 });

  try {
    const sb = getSupabaseAdmin();
    // Reemplazo total: borra y reinserta con el orden recibido.
    await sb.from('zoho_tipificar_opciones').delete().neq('status', '___none___');
    if (statuses.length) {
      await sb.from('zoho_tipificar_opciones').insert(
        statuses.map((status, i) => ({ status, orden: i + 1, activo: true }))
      );
    }
    invalidateZohoMapsCache();
    return NextResponse.json({ ok: true, count: statuses.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error guardando en Supabase';
    console.error('[admin/zoho/tipificar POST]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
