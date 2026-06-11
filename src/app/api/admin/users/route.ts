import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { canApproveAccess } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

const ALLOWED_ROLES = ['Asesor', 'Líder', 'Channel', 'Project M', 'Admin'];
const ALLOWED_ACTIONS = ['approve', 'reject', 'suspend', 'reactivate', 'set-role', 'delete'] as const;
type Action = (typeof ALLOWED_ACTIONS)[number];

/**
 * GET /api/admin/users
 * Lista todos los usuarios para el panel admin. Pendientes primero.
 * Solo admins (allowlist por email).
 */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!canApproveAccess(email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('user_roles')
    .select(
      'user_email, display_name, departamento, rol, status, is_superadmin, approved_by, approved_at, created_at, photo_url'
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[admin/users] GET error:', error.message);
    return NextResponse.json({ error: 'Error leyendo usuarios' }, { status: 500 });
  }

  // Pendientes primero, luego el resto por fecha
  const rank = (s: string) => (s === 'pending' ? 0 : s === 'suspended' ? 1 : 2);
  const users = (data || []).sort((a, b) => rank(a.status) - rank(b.status));
  const pendingCount = users.filter((u) => u.status === 'pending').length;

  return NextResponse.json({ users, pendingCount });
}

/**
 * POST /api/admin/users
 * Acciones de un admin sobre un usuario.
 * Body: { email: string, action: approve|reject|suspend|reactivate|set-role, rol?: string }
 */
export async function POST(req: Request) {
  const session = await auth();
  const adminEmail = session?.user?.email;
  if (!adminEmail) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!canApproveAccess(adminEmail)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  let body: { email?: string; action?: Action; rol?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const targetEmail = (body.email || '').trim().toLowerCase();
  const action = body.action;
  const rol = body.rol;

  if (!targetEmail) return NextResponse.json({ error: 'Falta email' }, { status: 400 });
  if (!action || !ALLOWED_ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  }
  if ((action === 'approve' || action === 'set-role') && rol && !ALLOWED_ROLES.includes(rol)) {
    return NextResponse.json({ error: `Rol inválido: ${rol}` }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Proteger a los superadmins: no se pueden rechazar/suspender ni degradar.
  const { data: target } = await supabase
    .from('user_roles')
    .select('user_email, is_superadmin, status')
    .eq('user_email', targetEmail)
    .single();

  if (!target) return NextResponse.json({ error: 'Usuario no existe' }, { status: 404 });
  if (target.is_superadmin && action !== 'set-role') {
    return NextResponse.json(
      { error: 'No puedes cambiar el estado de un administrador.' },
      { status: 403 }
    );
  }
  if (targetEmail === adminEmail.toLowerCase()) {
    return NextResponse.json({ error: 'No puedes eliminarte/modificarte a ti mismo.' }, { status: 403 });
  }

  // DELETE: borra la fila. Al volver a iniciar sesión, el usuario nace de nuevo
  // como 'pending' → requiere re-aprobación de un admin.
  if (action === 'delete') {
    const { error: delErr } = await supabase.from('user_roles').delete().eq('user_email', targetEmail);
    if (delErr) {
      console.error('[admin/users] delete error:', delErr.message);
      return NextResponse.json({ error: 'No se pudo eliminar' }, { status: 500 });
    }
    await logAudit(adminEmail, 'access.delete', targetEmail);
    return NextResponse.json({ ok: true, email: targetEmail, action });
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { updated_at: now };

  switch (action) {
    case 'approve':
      update.status = 'active';
      update.rol = rol || 'Asesor';
      update.approved_by = adminEmail;
      update.approved_at = now;
      break;
    case 'reject':
      update.status = 'rejected';
      update.approved_by = adminEmail;
      update.approved_at = now;
      break;
    case 'suspend':
      update.status = 'suspended';
      break;
    case 'reactivate':
      update.status = 'active';
      break;
    case 'set-role':
      if (!rol) return NextResponse.json({ error: 'Falta rol' }, { status: 400 });
      update.rol = rol;
      break;
  }

  const { error } = await supabase
    .from('user_roles')
    .update(update)
    .eq('user_email', targetEmail);

  if (error) {
    console.error('[admin/users] POST error:', error.message);
    return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 });
  }

  await logAudit(adminEmail, `access.${action}`, targetEmail, rol ? { rol } : undefined);

  return NextResponse.json({ ok: true, email: targetEmail, action });
}
