import { getSupabaseAdmin } from '@/lib/supabase';
import { AssignManager, type AssignUser } from '@/components/admin/AssignManager';

// Datos frescos siempre (cambian carteras/usuarios).
export const dynamic = 'force-dynamic';

/**
 * /admin/asignar — Tablero de asignación de leads (solo admins; gate en layout).
 * Ver la cartera de un asesor, seleccionar leads y reasignarlos a otro asesor.
 * Las escrituras pasan por /api/zoho/assign (gateado a Líder/Admin + auditado).
 */
export default async function AdminAssignPage() {
  const { data } = await getSupabaseAdmin()
    .from('user_roles')
    .select('user_email, display_name, rol, status')
    .eq('status', 'active')
    .order('display_name', { ascending: true });

  const users: AssignUser[] = (data || []).map((u) => ({
    email: u.user_email,
    name: u.display_name || u.user_email.split('@')[0],
    rol: u.rol,
  }));

  return <AssignManager users={users} />;
}
