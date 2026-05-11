import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';
import { isAdmin } from '@/lib/admin-auth';

/**
 * Layout del dashboard administrativo.
 *
 * SEGURIDAD: validación server-side de email contra allowlist.
 * - Si no hay sesión → redirect a /login
 * - Si email no está en ADMIN_EMAILS → redirect a / (chat normal)
 *
 * Imposible de bypassear desde cliente — Server Components corren
 * en el servidor antes de enviar nada al navegador.
 *
 * Visual: completamente distinto al chat (gris oscuro / "ejecutivo"),
 * sin sidebar ni mascot. Tipografía densa para presentaciones.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/login');
  }
  if (!isAdmin(session.user.email)) {
    // No es admin — fuera. Redirige a chat normal sin pista de que /admin existe.
    redirect('/');
  }

  async function handleSignOut() {
    'use server';
    await signOut({ redirectTo: '/login' });
  }

  const userEmail = session.user.email;
  const userName = userEmail.split('@')[0].split('.')[0];
  const capName = userName.charAt(0).toUpperCase() + userName.slice(1);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Header ejecutivo — fondo navy oscuro, tipografía limpia */}
      <header className="bg-[#0f1c2e] dark:bg-[#0a1422] border-b border-slate-700/50 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#F7941D]/20 border border-[#F7941D]/40 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F7941D" strokeWidth="2" strokeLinecap="round">
                <path d="M3 3v18h18"/>
                <path d="m19 9-5 5-4-4-3 3"/>
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Windmar AI · Analytics</h1>
              <p className="text-xs text-slate-400">Panel administrativo · Solo personal autorizado</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{capName}</p>
              <p className="text-xs text-slate-400">{userEmail}</p>
            </div>
            <form action={handleSignOut}>
              <button
                type="submit"
                className="text-xs text-slate-300 hover:text-white px-3 py-1.5 border border-slate-700 rounded hover:border-slate-500 transition-colors cursor-pointer"
              >
                Salir
              </button>
            </form>
            <a
              href="/"
              className="text-xs text-[#F7941D] hover:text-[#e8830d] px-3 py-1.5 border border-[#F7941D]/40 rounded hover:border-[#F7941D] transition-colors"
              title="Volver al chat"
            >
              ← Chat
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-6 text-center">
        <p className="text-[10px] text-slate-400 tracking-wider">
          Windmar Home Puerto Rico · Datos en vivo de Supabase
        </p>
      </footer>
    </div>
  );
}
