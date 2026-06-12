import { signIn } from '@/auth';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50 dark:bg-[#0a1628] relative overflow-hidden">
      {/* ──────────────────────────────────────────────────────────────
          TRAMA DE FONDO: glow naranja pulsante (estilo WINDMAR-QA-CALLS).
          Circular 700×700, blur 60px, escala 1 ↔ 1.15 cada 3s.
          Pointer-events-none para que NO interfiera con clicks del form.
          ────────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="login-bg-glow" />
      </div>

      {/* Contenido sin card — flota directo sobre el fondo */}
      <div className="w-full max-w-md relative z-10">

        {/* ──────────────────────────────────────────────────────────
            LOGO + TÍTULOS — SUN BOT al doble (128×128) con halo
            respirando. Fade-in inicial.
            ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center mb-10 gap-3 login-fade-in">
          <div
            className="relative flex items-center justify-center"
            style={{ width: 160, height: 160 }}
          >
            {/* Halo difuso que respira detrás del bot */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(247,148,29,0.65) 0%, rgba(247,148,29,0.20) 50%, transparent 75%)',
                filter: 'blur(14px)',
                animation: 'haloBreathe 2.4s ease-in-out infinite',
              }}
            />
            <img
              src="/sunbot.png"
              alt="Windmar AI"
              className="mascot-img relative z-10 w-32 h-32 object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>

          <h1 className="text-2xl font-bold text-[#1B3A5C] dark:text-white mt-2 tracking-tight">
            Agente Windmar Home
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-sm">
            Inicia sesión con tu correo corporativo Windmar
          </p>
        </div>

        {/* ──────────────────────────────────────────────────────────
            BOTÓN MICROSOFT con neón Windmar (intacto del diseño previo).
            Fade-in con 200ms de delay para efecto cascada.
            ────────────────────────────────────────────────────────── */}
        <div className="login-fade-in-delayed">
          <form
            action={async () => {
              'use server';
              await signIn('microsoft-entra-id', { redirectTo: '/' });
            }}
          >
            <div className="ms-neon relative group">
              {/* Halo difuso exterior — aparece en hover, da el "neón" */}
              <div
                aria-hidden
                className="absolute -inset-3 rounded-2xl opacity-30 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse at center, rgba(247,148,29,0.55) 0%, rgba(27,58,92,0.35) 45%, transparent 75%)',
                  filter: 'blur(18px)',
                }}
              />

              {/* El botón en sí — fondo navy Windmar con sutil gradient */}
              <button
                type="submit"
                className="relative w-full flex items-center justify-center gap-3 rounded-xl py-3 px-4 text-sm font-semibold transition-all duration-300 cursor-pointer text-white"
                style={{
                  background:
                    'linear-gradient(135deg, #0f1c2e 0%, #1B3A5C 60%, #0f1c2e 100%)',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 14px rgba(15,28,46,0.25)',
                }}
              >
                {/* Logo Microsoft neón — outline en lugar de relleno, cada
                    cuadro emite glow de su propio color (rojo/verde/azul/
                    amarillo) vía filter SVG. Se intensifica en hover. */}
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 22 22"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="ms-logo-neon transition-transform duration-300 group-hover:scale-110"
                >
                  <defs>
                    <filter id="ms-square-glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="0.7" result="blur1" />
                      <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="blur2" />
                      <feMerge>
                        <feMergeNode in="blur2" />
                        <feMergeNode in="blur1" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <g filter="url(#ms-square-glow)">
                    <rect x="1.5" y="1.5" width="8" height="8" rx="0.6" fill="none" stroke="#F25022" strokeWidth="1.4" />
                    <rect x="12.5" y="1.5" width="8" height="8" rx="0.6" fill="none" stroke="#7FBA00" strokeWidth="1.4" />
                    <rect x="1.5" y="12.5" width="8" height="8" rx="0.6" fill="none" stroke="#00A4EF" strokeWidth="1.4" />
                    <rect x="12.5" y="12.5" width="8" height="8" rx="0.6" fill="none" stroke="#FFB900" strokeWidth="1.4" />
                  </g>
                </svg>
                Iniciar sesión
              </button>

              {/* Trazos neón animados — TL→BR y BR→TL, glow naranja Windmar */}
              <svg
                aria-hidden
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 200 48"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="ms-neon-grad-a" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F7941D" />
                    <stop offset="40%" stopColor="#FFB347" />
                    <stop offset="100%" stopColor="#1B3A5C" />
                  </linearGradient>
                  <linearGradient id="ms-neon-grad-b" x1="100%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#F7941D" />
                    <stop offset="40%" stopColor="#FFB347" />
                    <stop offset="100%" stopColor="#1B3A5C" />
                  </linearGradient>
                </defs>

                <path
                  className="ms-neon-path"
                  pathLength={100}
                  d="M 12 0.5 L 188 0.5 Q 199.5 0.5 199.5 12 L 199.5 36 Q 199.5 47.5 188 47.5"
                  fill="none"
                  stroke="url(#ms-neon-grad-a)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />

                <path
                  className="ms-neon-path"
                  pathLength={100}
                  d="M 188 47.5 L 12 47.5 Q 0.5 47.5 0.5 36 L 0.5 12 Q 0.5 0.5 12 0.5"
                  fill="none"
                  stroke="url(#ms-neon-grad-b)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          </form>

          {/* Footer 1 — solo cuentas autorizadas (acento naranja) */}
          <p className="text-[12px] text-gray-500 dark:text-gray-400 text-center mt-6">
            Solo cuentas <strong className="text-[#F7941D]">@windmarhome.com</strong> y{' '}
            <strong className="text-[#F7941D]">@windmarenergy.com</strong>
          </p>
        </div>

        {/* Footer 2 — ayuda, con fade-in más tardío */}
        <p className="text-[11px] text-gray-500 dark:text-gray-500 text-center leading-relaxed mt-4 login-fade-in-delayed-2">
          Si tienes problemas para iniciar sesión, contacta a IT.
        </p>
      </div>

      {/* ──────────────────────────────────────────────────────────
          ANIMACIONES Y EFECTOS
          ────────────────────────────────────────────────────────── */}
      <style>{`
        /* Glow naranja del fondo — respira de escala 1 a 1.15 cada 3s.
           Naranja Windmar (#F7941D ≈ rgba(248,155,36)) con muy alto blur
           para que sea ambient, no protagonista. */
        @keyframes login-glow-pulse {
          0%, 100% { transform: scale(1); opacity: 0.35; }
          50%      { transform: scale(1.15); opacity: 0.55; }
        }
        .login-bg-glow {
          width: 700px;
          height: 700px;
          background: radial-gradient(circle,
            rgba(248,155,36,0.30) 0%,
            rgba(248,155,36,0.10) 40%,
            transparent 70%);
          border-radius: 50%;
          animation: login-glow-pulse 3s ease-in-out infinite;
          filter: blur(60px);
        }

        /* Fade-in en cascada — logo → botón → footer ayuda */
        @keyframes login-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .login-fade-in            { animation: login-fade-in 700ms cubic-bezier(.2,.9,.3,1.2) both; }
        .login-fade-in-delayed    { animation: login-fade-in 700ms cubic-bezier(.2,.9,.3,1.2) 200ms both; }
        .login-fade-in-delayed-2  { animation: login-fade-in 700ms cubic-bezier(.2,.9,.3,1.2) 400ms both; }

        /* Halo que respira detrás del SUN BOT — más sutil y rápido */
        @keyframes haloBreathe {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 1; transform: scale(1.15); }
        }

        /* Trazos neón del botón — nacen en hover, glow naranja real */
        .ms-neon-path {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          filter:
            drop-shadow(0 0 3px rgba(247,148,29,0.85))
            drop-shadow(0 0 7px rgba(247,148,29,0.45));
          transition: stroke-dashoffset 0.9s cubic-bezier(0.65, 0, 0.35, 1);
        }
        .ms-neon:hover .ms-neon-path {
          stroke-dashoffset: 0;
        }

        /* Accesibilidad: respeta usuarios con motion reducido. */
        @media (prefers-reduced-motion: reduce) {
          .login-bg-glow,
          .login-fade-in,
          .login-fade-in-delayed,
          .login-fade-in-delayed-2 {
            animation: none;
          }
          .ms-neon-path { transition: none; }
          .ms-neon:hover .ms-neon-path { stroke-dashoffset: 0; }
        }
      `}</style>
    </main>
  );
}
