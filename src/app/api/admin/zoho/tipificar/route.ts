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
 * Body: { items: Array<{status, plantilla?}> } — lista completa (en orden) de
 * estados + plantilla de nota que aparecen en el cuadro de tipificación.
 * Reemplaza la lista entera. Cada status debe ser un Lead_Status oficial.
 */
export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!isAdmin(email)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  let body: { items?: Array<{ status?: string; plantilla?: string | null }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const raw = Array.isArray(body.items) ? body.items : null;
  if (!raw) return NextResponse.json({ error: 'Falta la lista de estados' }, { status: 400 });
  // Dedup por status, conserva orden.
  const seen = new Set<string>();
  const items: Array<{ status: string; plantilla: string | null }> = [];
  for (const it of raw) {
    const status = (it.status || '').trim();
    if (!status || seen.has(status)) continue;
    seen.add(status);
    items.push({ status, plantilla: (it.plantilla ?? '').trim() || null });
  }
  const invalid = items.find((r) => !VALID_LEAD_STATUSES.includes(r.status));
  if (invalid) return NextResponse.json({ error: `Estado no válido: "${invalid.status}". Debe ser un Lead_Status oficial.` }, { status: 400 });

  try {
    const sb = getSupabaseAdmin();
    // Reemplazo total: borra y reinserta con el orden recibido.
    await sb.from('zoho_tipificar_opciones').delete().neq('status', '___none___');
    if (items.length) {
      await sb.from('zoho_tipificar_opciones').insert(
        items.map((r, i) => ({ status: r.status, plantilla: r.plantilla, orden: i + 1, activo: true }))
      );
    }
    invalidateZohoMapsCache();
    return NextResponse.json({ ok: true, count: items.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error guardando en Supabase';
    console.error('[admin/zoho/tipificar POST]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
