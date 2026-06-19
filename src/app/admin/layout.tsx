import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';
import { isAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { LiquidShaderBg } from '@/components/admin/LiquidShaderBg';
import './admin-theme.css';

// Favicon propio del admin (SUN BOT) — evita que se "pierda" el icono de la pestaña.
export const metadata = {
  title: 'Windmar Admin',
  icons: { icon: '/icon-192.png' },
};

/**
 * Layout del dashboard administrativo — Executive estilo neon.
 *
 * SEGURIDAD: validación server-side de email contra allowlist.
 * - Si no hay sesión → redirect a /login
 * - Si email no está en ADMIN_EMAILS → redirect a / (chat normal)
 *
 * VISUAL: tema oscuro/claro independiente del chat (vía data-theme en .admin-root).
 * Fonts custom (Bebas Neue, Outfit, JetBrains Mono) cargadas vía link tag.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/login');
  }
  if (!isAdmin(session.user.email)) {
    redirect('/');
  }

  async function handleSignOut() {
    'use server';
    await signOut({ redirectTo: '/login' });
  }

  // Conteo de accesos pendientes para el badge del enlace "Usuarios".
  let pendingCount = 0;
  try {
    const { count } = await getSupabaseAdmin()
      .from('user_roles')
      .select('user_email', { count: 'exact', head: true })
      .eq('status', 'pending');
    pendingCount = count ?? 0;
  } catch {
    pendingCount = 0;
  }

  return (
    <>
      {/* Fonts del executive dashboard */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap"
      />

      <div className="admin-root" style={{ background: '#05070d' }}>
        {/* Fondo líquido animado (shader Windmar) sobre negro */}
        <LiquidShaderBg />

        {/* Navegación como panel izquierdo (transparente + neón) */}
        <AdminSidebar pendingCount={pendingCount} signOutAction={handleSignOut} />

        <div className="relative z-[1] md:pl-[232px]">
          <div className="max-w-[1280px] mx-auto px-5 pt-6 pb-8">
            {children}

            <footer className="mt-8 text-center">
              <p className="ad-mono text-[10px] tracking-[0.18em]" style={{ color: 'var(--text3)' }}>
                WINDMAR HOME PUERTO RICO · DATOS EN VIVO · SUPABASE
              </p>
            </footer>
          </div>
        </div>
      </div>
    </>
  );
}
