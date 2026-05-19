import { signIn } from '@/auth';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a1628] p-4">
      <div className="bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-7 w-full max-w-sm">
        {/* Logo + título */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative flex items-center justify-center mb-3" style={{ width: 80, height: 80 }}>
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(247,148,29,0.55) 0%, rgba(247,148,29,0.15) 50%, transparent 75%)',
                filter: 'blur(10px)',
                animation: 'haloBreathe 2.4s ease-in-out infinite',
              }}
            />
            <img
              src="/sunbot.png"
              alt="Windmar AI"
              className="mascot-img relative z-10 w-16 h-16 object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          <h1 className="text-xl font-bold text-[#1B3A5C] dark:text-white">Agente Windmar Home</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
            Inicia sesión con tu cuenta de Microsoft Windmar
          </p>
        </div>

        {/* Botón Microsoft con efecto neón Windmar */}
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
              {/* Logo Microsoft neón — outline en lugar de relleno, cada cuadro
                  emite glow de su propio color (rojo/verde/azul/amarillo) vía
                  filter SVG. Se intensifica suavemente en hover del botón. */}
              <svg
                width="22"
                height="22"
                viewBox="0 0 22 22"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="ms-logo-neon transition-transform duration-300 group-hover:scale-110"
              >
                <defs>
                  {/* Filter: blur del stroke + merge con el original crisp = neón */}
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
              Iniciar sesión con Microsoft
            </button>

            {/* Trazos neón animados — dos paths nacen desde esquinas opuestas (TL y BR).
                pathLength normalizado a 100 → dashoffset 100 (invisible) ↔ 0 (visible).
                vectorEffect=non-scaling-stroke evita que el grosor se distorsione al
                estirar el SVG al tamaño del botón. */}
            <svg
              aria-hidden
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 200 48"
              preserveAspectRatio="none"
            >
              <defs>
                {/* Trazo TL→BR: nace naranja, termina navy */}
                <linearGradient id="ms-neon-grad-a" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F7941D" />
                  <stop offset="40%" stopColor="#FFB347" />
                  <stop offset="100%" stopColor="#1B3A5C" />
                </linearGradient>
                {/* Trazo BR→TL: nace naranja, termina navy (espejado) */}
                <linearGradient id="ms-neon-grad-b" x1="100%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#F7941D" />
                  <stop offset="40%" stopColor="#FFB347" />
                  <stop offset="100%" stopColor="#1B3A5C" />
                </linearGradient>
              </defs>

              {/* Path A: TL → top → TR corner → right → BR corner */}
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

              {/* Path B: BR → bottom → BL corner → left → TL corner */}
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

        <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-4">
          Solo cuentas <strong>@windmarhome.com</strong>
        </p>

        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
          <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center leading-relaxed">
            Si tienes problemas iniciando sesión, contacta a IT.
          </p>
        </div>

        <style>{`
          @keyframes haloBreathe {
            0%, 100% { opacity: 0.55; transform: scale(1); }
            50%       { opacity: 1; transform: scale(1.15); }
          }

          /* Trazos del neón — invisibles por defecto (offset=100).
             En hover del wrapper .ms-neon, offset baja a 0 → la línea "nace"
             desde el inicio de cada path y se completa en ~0.9s.
             drop-shadow doble = efecto glow naranja real (no solo línea). */
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

          /* Respeta usuarios con motion reducido — sin animación, solo visible */
          @media (prefers-reduced-motion: reduce) {
            .ms-neon-path {
              transition: none;
            }
            .ms-neon:hover .ms-neon-path {
              stroke-dashoffset: 0;
            }
          }
        `}</style>
      </div>
    </main>
  );
}
