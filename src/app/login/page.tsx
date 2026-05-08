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

        {/* Botón de Microsoft — Server Action */}
        <form
          action={async () => {
            'use server';
            await signIn('microsoft-entra-id', { redirectTo: '/' });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 bg-[#0078D4] hover:bg-[#005A9E] text-white rounded-xl py-3 px-4 text-sm font-semibold transition-colors cursor-pointer"
          >
            {/* Logo Microsoft (4 cuadrados oficiales) */}
            <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            Iniciar sesión con Microsoft
          </button>
        </form>

        <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-4">
          Solo cuentas <strong>@windmarhome.com</strong>
        </p>

        {/* Info adicional */}
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
        `}</style>
      </div>
    </main>
  );
}
