import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';
import { isAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { AdminClock } from '@/components/admin/AdminClock';
import { AdminThemeToggle } from '@/components/admin/AdminThemeToggle';
import './admin-theme.css';

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

  const userEmail = session.user.email;
  const userName = userEmail.split('@')[0].split('.')[0];
  const capName = userName.charAt(0).toUpperCase() + userName.slice(1);

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

      <div className="admin-root">
        {/* Ambient: orbs flotantes + grid de fondo */}
        <div className="ad-bg-fx">
          <div className="ad-orb ad-o1" />
          <div className="ad-orb ad-o2" />
          <div className="ad-orb ad-o3" />
          <div className="ad-orb ad-o4" />
        </div>
        <div className="ad-bg-grid" />

        <div className="relative z-[1] max-w-[1280px] mx-auto px-5 pb-8">
          {/* Topbar */}
          <nav className="ad-topbar">
            <div className="flex items-center gap-4">
              {/* SUN BOT grande sin fondo — solo PNG con drop-shadow naranja */}
              <img
                src="/sunbot-feliz.png"
                alt="SUN BOT — Windmar AI"
                className="ad-brand-mascot"
              />
              <div>
                <div className="ad-brand-title">WINDMAR HOME</div>
                <div className="ad-brand-sub">
                  Resumen Ejecutivo · Admin {capName}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="ad-live">
                <span className="ad-live-dot" />EN VIVO
              </div>
              <AdminClock />
              <AdminThemeToggle />
              <a
                href="/admin"
                className="ad-mono text-[10px] uppercase tracking-[0.15em] px-3 py-2 rounded-lg border border-[var(--glass-border)] hover:border-[var(--n4)] hover:text-[var(--n4)] transition-colors"
                style={{ color: 'var(--text2)', background: 'var(--glass-bg)' }}
                title="Dashboard"
              >
                Dashboard
              </a>
              <a
                href="/admin/usuarios"
                className="ad-mono text-[10px] uppercase tracking-[0.15em] px-3 py-2 rounded-lg border border-[var(--glass-border)] hover:border-[var(--n4)] hover:text-[var(--n4)] transition-colors relative"
                style={{ color: 'var(--text2)', background: 'var(--glass-bg)' }}
                title="Usuarios y accesos"
              >
                Usuarios
                {pendingCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 flex items-center justify-center"
                    style={{
                      minWidth: 16, height: 16, padding: '0 4px', fontSize: 10, fontWeight: 700,
                      background: '#F7941D', color: '#1B3A5C', borderRadius: 999,
                    }}
                  >
                    {pendingCount}
                  </span>
                )}
              </a>
              <a
                href="/admin/gestion"
                className="ad-mono text-[10px] uppercase tracking-[0.15em] px-3 py-2 rounded-lg border border-[var(--glass-border)] hover:border-[var(--n4)] hover:text-[var(--n4)] transition-colors"
                style={{ color: '#F7941D', background: 'var(--glass-bg)', borderColor: 'rgba(247,148,29,0.4)' }}
                title="Chat de gestión con el agente"
              >
                ☀ Gestión
              </a>
              <a
                href="/admin/asignar"
                className="ad-mono text-[10px] uppercase tracking-[0.15em] px-3 py-2 rounded-lg border border-[var(--glass-border)] hover:border-[var(--n4)] hover:text-[var(--n4)] transition-colors"
                style={{ color: 'var(--text2)', background: 'var(--glass-bg)' }}
                title="Asignar leads"
              >
                Asignar
              </a>
              <a
                href="/admin/zoho"
                className="ad-mono text-[10px] uppercase tracking-[0.15em] px-3 py-2 rounded-lg border border-[var(--glass-border)] hover:border-[var(--n4)] hover:text-[var(--n4)] transition-colors"
                style={{ color: 'var(--text2)', background: 'var(--glass-bg)' }}
                title="Configuración y salud de Zoho"
              >
                Zoho
              </a>
              <a
                href="/admin/auditoria"
                className="ad-mono text-[10px] uppercase tracking-[0.15em] px-3 py-2 rounded-lg border border-[var(--glass-border)] hover:border-[var(--n4)] hover:text-[var(--n4)] transition-colors"
                style={{ color: 'var(--text2)', background: 'var(--glass-bg)' }}
                title="Registro de auditoría"
              >
                Auditoría
              </a>
              <a
                href="/"
                className="ad-mono text-[10px] uppercase tracking-[0.15em] px-3 py-2 rounded-lg border border-[var(--glass-border)] hover:border-[var(--n4)] hover:text-[var(--n4)] transition-colors"
                style={{ color: 'var(--text2)', background: 'var(--glass-bg)' }}
                title="Volver al chat"
              >
                ← Chat
              </a>
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="ad-mono text-[10px] uppercase tracking-[0.15em] px-3 py-2 rounded-lg border border-[var(--glass-border)] hover:border-[var(--n6)] hover:text-[var(--n6)] transition-colors cursor-pointer"
                  style={{ color: 'var(--text2)', background: 'var(--glass-bg)' }}
                  title={`Cerrar sesión de ${capName}`}
                >
                  Salir
                </button>
              </form>
            </div>
          </nav>

          {children}

          <footer className="mt-8 text-center">
            <p className="ad-mono text-[10px] tracking-[0.18em]" style={{ color: 'var(--text3)' }}>
              WINDMAR HOME PUERTO RICO · DATOS EN VIVO · SUPABASE
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}
