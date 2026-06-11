import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { canApproveAccess } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getZohoUserIdByEmail } from '@/lib/zoho';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/admin/zoho-sync
 * Resuelve el Owner ID de Zoho para cada usuario activo (por correo) y lo
 * guarda en user_roles.zoho_user_id. Solo admins.
 * Devuelve cuántos quedaron mapeados y cuáles no tienen usuario en Zoho.
 */
export async function POST() {
  const session = await auth();
  const adminEmail = session?.user?.email;
  if (!adminEmail) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!canApproveAccess(adminEmail)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_email')
    .eq('status', 'active');

  if (error) {
    return NextResponse.json({ error: 'Error leyendo usuarios' }, { status: 500 });
  }

  const unmapped: string[] = [];
  let mapped = 0;

  for (const u of data || []) {
    try {
      const id = await getZohoUserIdByEmail(u.user_email);
      if (id) {
        await supabase.from('user_roles').update({ zoho_user_id: id }).eq('user_email', u.user_email);
        mapped++;
      } else {
        unmapped.push(u.user_email);
      }
    } catch {
      unmapped.push(u.user_email);
    }
  }

  await logAudit(adminEmail, 'zoho.sync', null, { mapped, unmapped: unmapped.length });

  return NextResponse.json({ ok: true, total: (data || []).length, mapped, unmapped });
}
