import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';

/**
 * Pantalla de espera para usuarios con status != 'active'.
 * El middleware manda aquí a los pendientes/rechazados/suspendidos.
 * Si el usuario ya está activo, lo devolvemos al chat.
 */
export default async function PendingPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect('/login');
  }

  const u = session.user as unknown as Record<string, string | null | undefined>;
  const status = (u.status as string | undefined) ?? 'active';
  if (status === 'active') {
    redirect('/');
  }

  const nombre = (u.displayName as string) || session.user.email!.split('@')[0];

  const rejected = status === 'rejected';
  const suspended = status === 'suspended';

  const titulo = rejected
    ? 'Tu acceso fue rechazado'
    : suspended
      ? 'Tu acceso está suspendido'
      : 'Tu acceso está en revisión';

  const mensaje = rejected
    ? 'Un administrador no aprobó el acceso a Sun Bot con esta cuenta. Si crees que es un error, contacta a tu líder o a IT.'
    : suspended
      ? 'Tu acceso a Sun Bot fue suspendido temporalmente. Contacta a tu líder o a IT para reactivarlo.'
      : 'Recibimos tu solicitud. Un administrador debe aprobar tu acceso. Te avisaremos por correo cuando esté listo — normalmente es rápido.';

  async function handleSignOut() {
    'use server';
    await signOut({ redirectTo: '/login' });
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50 dark:bg-[#0a1628] relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="login-bg-glow" />
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col items-center text-center login-fade-in">
        <div className="relative flex items-center justify-center" style={{ width: 150, height: 150 }}>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(247,148,29,0.55) 0%, rgba(247,148,29,0.18) 50%, transparent 75%)',
              filter: 'blur(14px)',
              animation: 'haloBreathe 2.4s ease-in-out infinite',
            }}
          />
          <img
            src={rejected || suspended ? '/sunbot-pensando.png' : '/sunbot-cargando.png'}
            alt="SUN BOT"
            className="relative z-10 w-28 h-28 object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        <h1 className="text-2xl font-bold text-[#1B3A5C] dark:text-white mt-6 tracking-tight">
          {titulo}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 leading-relaxed max-w-sm">
          Hola <strong>{nombre}</strong>. {mensaje}
        </p>

        {!rejected && !suspended && (
          <div className="mt-5 inline-flex items-center gap-2 text-[13px] text-[#F7941D] font-medium">
            <span className="login-bg-glow" style={{ width: 8, height: 8, filter: 'none' }} />
            Esperando aprobación…
          </div>
        )}

        <form action={handleSignOut} className="mt-8">
          <button
            type="submit"
            className="text-[13px] px-5 py-2.5 rounded-lg border border-gray-300 dark:border-white/15 text-gray-600 dark:text-gray-300 hover:border-[#F7941D] hover:text-[#F7941D] transition-colors cursor-pointer"
          >
            Cerrar sesión
          </button>
        </form>

        <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-6">
          ¿Dudas? Contacta a IT o a tu líder de área.
        </p>
      </div>

      <style>{`
        @keyframes login-glow-pulse {
          0%, 100% { transform: scale(1); opacity: 0.35; }
          50%      { transform: scale(1.15); opacity: 0.55; }
        }
        .login-bg-glow {
          width: 700px; height: 700px;
          background: radial-gradient(circle, rgba(248,155,36,0.30) 0%, rgba(248,155,36,0.10) 40%, transparent 70%);
          border-radius: 50%;
          animation: login-glow-pulse 3s ease-in-out infinite;
          filter: blur(60px);
        }
        @keyframes login-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .login-fade-in { animation: login-fade-in 700ms cubic-bezier(.2,.9,.3,1.2) both; }
        @keyframes haloBreathe {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 1; transform: scale(1.15); }
        }
        @media (prefers-reduced-motion: reduce) {
          .login-bg-glow, .login-fade-in { animation: none; }
        }
      `}</style>
    </main>
  );
}
