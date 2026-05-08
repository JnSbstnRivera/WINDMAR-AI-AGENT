'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface Props {
  initialDisplayName: string; // viene pre-llenado con el primer nombre extraído de Microsoft
  microsoftFullName: string;  // nombre completo original de Microsoft (para mostrar como referencia)
  email: string;
  greeting: string;           // "Buenos días" / "Buenas tardes" / "Buenas noches" según hora PR
  onComplete: () => void;     // se llama cuando termina el onboarding
}

const DEPARTAMENTOS = ['Telemercadeo', 'Ventas', 'Vass', 'Calidad'];
const ROLES: Array<{
  value: string;
  label: string;
  description: string;
}> = [
  { value: 'Asesor', label: 'Asesor', description: 'Atención directa a clientes en llamadas' },
  { value: 'Líder', label: 'Líder', description: 'Manejas un equipo de Asesores y Channels' },
  { value: 'Channel', label: 'Channel', description: 'Soporte semi-líder y documentación' },
  { value: 'Project M', label: 'Project M', description: 'Jefe de todas las áreas del call center' },
];

function isValidDisplayName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 30) return false;
  return /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'\-]+$/.test(trimmed);
}

function capitalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function OnboardingModal({
  initialDisplayName,
  microsoftFullName,
  email,
  greeting,
  onComplete,
}: Props) {
  const { update } = useSession();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [departamento, setDepartamento] = useState('');
  const [rol, setRol] = useState('Asesor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const nameOk = isValidDisplayName(displayName);
  const formValid = nameOk && departamento && rol;
  const finalName = capitalizeName(displayName);

  // Detectar si el asesor cambió el nombre del default
  const userEditedName = displayName.trim() !== initialDisplayName.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/profile/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: finalName,
          departamento,
          rol,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No pudimos guardar. Intenta de nuevo.');
        setLoading(false);
        return;
      }

      // Actualizar JWT directamente con los datos nuevos (más confiable que re-leer DB)
      await update({
        displayName: finalName,
        departamento,
        rol,
        onboardedAt: data.onboarded_at,
      });

      setShowSuccess(true);
      // Animación de éxito breve antes de continuar al chat
      setTimeout(() => {
        onComplete();
      }, 1800);
    } catch {
      setError('Error de conexión. Verifica tu internet.');
      setLoading(false);
    }
  }

  // Pantalla de éxito (se muestra brevemente antes de redirigir al chat)
  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-10 max-w-md w-full text-center animate-fade-in">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#1B3A5C] dark:text-white mb-2">
            ¡Listo, {finalName.split(' ')[0]}!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-1">
            Te llamaré <span className="font-bold text-[#F7941D]">{finalName}</span> desde ahora.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            Bienvenido al equipo de <span className="font-semibold">{departamento}</span>
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#F7941D]" style={{ animation: 'dotBounce 1.2s ease-in-out 0s infinite' }} />
            <span className="w-2 h-2 rounded-full bg-[#F7941D]" style={{ animation: 'dotBounce 1.2s ease-in-out 0.2s infinite' }} />
            <span className="w-2 h-2 rounded-full bg-[#F7941D]" style={{ animation: 'dotBounce 1.2s ease-in-out 0.4s infinite' }} />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
            Cargando tu chat...
          </p>
          <style>{`
            @keyframes dotBounce {
              0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
              40%            { transform: translateY(-6px); opacity: 1; }
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: scale(0.95); }
              to   { opacity: 1; transform: scale(1); }
            }
            .animate-fade-in { animation: fadeIn 0.4s ease-out; }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full my-8">
        {/* Hero con SUN BOT */}
        <div className="px-7 pt-8 pb-5 text-center border-b border-gray-100 dark:border-gray-800">
          <div className="relative flex items-center justify-center mx-auto mb-4" style={{ width: 100, height: 100 }}>
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(247,148,29,0.7) 0%, rgba(247,148,29,0.2) 50%, transparent 75%)',
                filter: 'blur(14px)',
                animation: 'haloBreathe 2s ease-in-out infinite',
              }}
            />
            <img
              src="/sunbot-feliz.png"
              alt="SUN BOT"
              className="mascot-img relative z-10 w-24 h-24 object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          <h1 className="text-2xl font-bold text-[#1B3A5C] dark:text-white mb-1">
            ¡{greeting}!
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Solo 3 preguntas para que el agente te conozca
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5">
          {/* Nombre — pre-llenado con primer nombre */}
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-2 uppercase tracking-wider">
              ¿Cómo quieres que te llame?
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ej: Juan, Andy, Don Pepe..."
              maxLength={30}
              required
              className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-[#1e293b] dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F7941D] transition-colors"
              autoFocus
            />
            <div className="mt-2 flex items-start gap-2">
              {userEditedName ? (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                  ✓ Editado de <span className="line-through opacity-60">{microsoftFullName}</span>
                </p>
              ) : (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                  💡 Tomado de tu cuenta Microsoft. <span className="font-semibold">Edítalo</span> si prefieres un apodo (ej: solo &quot;Juan&quot; o &quot;Don Pepe&quot;).
                </p>
              )}
            </div>
            {displayName.length > 0 && !nameOk && (
              <p className="text-[11px] text-red-500 mt-1">
                Solo letras y espacios, entre 2 y 30 caracteres
              </p>
            )}
          </div>

          {/* Departamento */}
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-2 uppercase tracking-wider">
              ¿En qué departamento trabajas?
            </label>
            <select
              value={departamento}
              onChange={(e) => setDepartamento(e.target.value)}
              required
              className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-[#1e293b] dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#F7941D] transition-colors cursor-pointer"
            >
              <option value="" disabled>
                Selecciona...
              </option>
              {DEPARTAMENTOS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Rol con descripciones */}
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-2 uppercase tracking-wider">
              ¿Cuál es tu rol?
            </label>
            <div className="space-y-1.5">
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all border-2 ${
                    rol === r.value
                      ? 'bg-[#F7941D]/10 dark:bg-[#F7941D]/20 border-[#F7941D]'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="rol"
                    value={r.value}
                    checked={rol === r.value}
                    onChange={(e) => setRol(e.target.value)}
                    className="mt-0.5 accent-[#F7941D] cursor-pointer"
                  />
                  <div className="flex-1 leading-tight">
                    <div className="text-sm font-semibold text-[#1B3A5C] dark:text-white">
                      {r.label}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      {r.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 italic">
              ⓘ El agente adapta el tono de sus respuestas según tu rol
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-3 py-2.5 rounded-lg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={loading || !formValid}
            className="w-full bg-gradient-to-br from-[#F7941D] to-[#e8830d] hover:from-[#e8830d] hover:to-[#d97700] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-bold transition-all cursor-pointer shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Guardando...
              </span>
            ) : (
              'Empezar a chatear ☀️'
            )}
          </button>

          {/* Email del asesor (informativo) */}
          <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
            Sesión iniciada como <span className="font-mono">{email}</span>
          </p>
        </form>
      </div>

      <style>{`
        @keyframes haloBreathe {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%       { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
