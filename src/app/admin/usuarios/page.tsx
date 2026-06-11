import { getSupabaseAdmin } from '@/lib/supabase';
import { UsersManager, type AdminUser } from '@/components/admin/UsersManager';

// Siempre datos frescos (lista de accesos cambia con cada aprobación).
export const dynamic = 'force-dynamic';

/**
 * /admin/usuarios — Gestión de accesos y roles.
 * La autorización (allowlist por email) ya la aplica src/app/admin/layout.tsx.
 */
export default async function AdminUsersPage() {
  const { data } = await getSupabaseAdmin()
    .from('user_roles')
    .select(
      'user_email, display_name, departamento, rol, status, is_superadmin, approved_by, approved_at, created_at, photo_url'
    )
    .order('created_at', { ascending: false });

  const rank = (s: string) => (s === 'pending' ? 0 : s === 'suspended' ? 1 : 2);
  const users = ((data || []) as AdminUser[]).sort(
    (a, b) => rank(a.status) - rank(b.status)
  );

  return <UsersManager initialUsers={users} />;
}
