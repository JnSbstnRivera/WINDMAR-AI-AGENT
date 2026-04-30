import { useState } from 'react';
import { supabase } from '../lib/supabase';

type View = 'login' | 'forgot';

const DEPARTAMENTOS = ['Telemercadeo', 'Ventas', 'Vass', 'Calidad'];
const ROLES = ['Asesor', 'Jefe', 'Channel'];

const TERMS_VERSION = 'v1.0 — Abril 2026';
const TERMS_TEXT = `Bienvenido al Agente Windmar Home.

Esta es una aplicación en constante cambio y mejora continua. Por favor valida siempre la información proporcionada por el agente en las herramientas oficiales de la compañía antes de comunicársela al cliente.

El agente es una herramienta de apoyo, no reemplaza el criterio profesional del asesor ni los procesos oficiales de Windmar Home Puerto Rico.

Al usar esta aplicación aceptas:
• Verificar la información en las herramientas oficiales antes de cotizar.
• Reportar cualquier respuesta incorrecta o desactualizada al equipo técnico.
• No compartir tu acceso con personas externas a la compañía.
• Usar esta herramienta exclusivamente con fines laborales.

Versión: ${TERMS_VERSION}`;

function getPasswordStrength(pwd: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pwd.length === 0) return { level: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { level: 1, label: 'Débil', color: '#ef4444' };
  if (score <= 3) return { level: 2, label: 'Media', color: '#f59e0b' };
  return { level: 3, label: 'Fuerte', color: '#22c55e' };
}

export function LoginScreen() {
  const [view, setView] = useState<View>('login');
  const [flipped, setFlipped] = useState(false);

  // Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Register
  const [regNombre, setRegNombre] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDepartamento, setRegDepartamento] = useState('');
  const [regRol, setRegRol] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regAcceptTerms, setRegAcceptTerms] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Shared
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const strength = getPasswordStrength(regPassword);
  const nombreOk = regNombre.trim().length >= 3;
  const regEmailOk = regEmail.trim().toLowerCase().endsWith('@windmarhome.com') && regEmail.length > '@windmarhome.com'.length;
  const passwordOk = regPassword.length >= 6;
  const passwordsMatch = passwordOk && regPassword === regPasswordConfirm;
  const formValid =
    nombreOk && regEmailOk && regDepartamento && regRol && passwordsMatch && regAcceptTerms;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@windmarhome.com')) {
      setError('Solo se permiten correos corporativos @windmarhome.com');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener mínimo 6 caracteres');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (err) setError('Correo o contraseña incorrectos');
    else {
      try { sessionStorage.setItem('wh-just-logged-in', '1'); } catch {}
    }
    setLoading(false);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid) return;
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email: regEmail.trim().toLowerCase(),
      password: regPassword,
      options: {
        data: {
          full_name: regNombre.trim(),
          departamento: regDepartamento,
          rol: regRol,
          terms_version: TERMS_VERSION,
          terms_accepted_at: new Date().toISOString(),
        },
      },
    });
    if (err) setError(err.message);
    else setRegistered(true);
    setLoading(false);
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const clean = forgotEmail.trim().toLowerCase();
    if (!clean.endsWith('@windmarhome.com')) {
      setError('Solo correos @windmarhome.com');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo: `${window.location.origin}/`,
    });
    if (err) setError(err.message);
    else setForgotSent(true);
    setLoading(false);
  }

  function toggleFlip() {
    setFlipped((f) => !f);
    setError('');
  }

  // ---------------- Pantalla post-registro ----------------
  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a1628] p-4">
        <div className="bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
              <path d="M20 6L9 17L4 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Revisa tu correo</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Te enviamos un enlace de confirmación a <strong>{regEmail}</strong>. Confírmalo e inicia sesión.
          </p>
          <button
            onClick={() => { setRegistered(false); setFlipped(false); }}
            className="text-[#F7941D] text-sm font-medium hover:underline cursor-pointer"
          >
            Ir al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  // ---------------- Pantalla forgot password enviada ----------------
  if (forgotSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a1628] p-4">
        <div className="bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Revisa tu correo</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Te enviamos un enlace para restablecer tu contraseña a <strong>{forgotEmail}</strong>.
          </p>
          <button
            onClick={() => { setForgotSent(false); setView('login'); setForgotEmail(''); }}
            className="text-[#F7941D] text-sm font-medium hover:underline cursor-pointer"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  // ---------------- Pantalla forgot password ----------------
  if (view === 'forgot') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a1628] p-4">
        <div className="bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 w-full max-w-sm">
          <div className="flex flex-col items-center mb-6">
            <img src="/sunbot-pensando.png" alt="Windmar AI" className="mascot-img w-20 h-20 object-contain mb-3" style={{ imageRendering: 'pixelated' }} />
            <h1 className="text-xl font-bold text-[#1B3A5C] dark:text-white">Recuperar contraseña</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center">
              Te enviaremos un enlace para restablecerla
            </p>
          </div>
          <form onSubmit={handleForgot} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
                Correo corporativo
              </label>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="nombre@windmarhome.com"
                required
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#1e293b] dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F7941D] transition-colors"
              />
            </div>
            {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#F7941D] hover:bg-[#e8830d] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors cursor-pointer"
            >
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>
          </form>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
            <button
              onClick={() => { setView('login'); setError(''); }}
              className="text-[#F7941D] font-medium hover:underline cursor-pointer"
            >
              ← Volver al inicio de sesión
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ---------------- Tarjeta principal con flip ----------------
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a1628] p-4 py-8">
      <div className="flip-card w-full max-w-sm">
        <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
          {/* ============== FRONTAL — LOGIN ============== */}
          <div className="flip-card-face flip-card-front bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex flex-col items-center mb-8">
              <img
                src="/sunbot.png"
                alt="Windmar AI"
                className="mascot-img w-20 h-20 object-contain mb-3"
                style={{ imageRendering: 'pixelated' }}
              />
              <h1 className="text-xl font-bold text-[#1B3A5C] dark:text-white">Agente Windmar Home</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Inicia sesión para continuar</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
                  Correo corporativo
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@windmarhome.com"
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#1e293b] dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F7941D] transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#1e293b] dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-4 py-2.5 pr-11 text-sm focus:outline-none focus:border-[#F7941D] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && !flipped && (
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#F7941D] hover:bg-[#e8830d] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors cursor-pointer"
              >
                {loading ? 'Cargando...' : 'Iniciar sesión'}
              </button>

              <button
                type="button"
                onClick={() => { setView('forgot'); setError(''); setForgotEmail(email); }}
                className="w-full text-xs text-gray-500 dark:text-gray-400 hover:text-[#F7941D] dark:hover:text-[#F7941D] transition-colors cursor-pointer"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </form>

            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
              ¿No tienes cuenta?{' '}
              <button
                type="button"
                onClick={toggleFlip}
                className="text-[#F7941D] font-medium hover:underline cursor-pointer"
              >
                Regístrate
              </button>
            </p>
          </div>

          {/* ============== TRASERA — REGISTRO ============== */}
          <div className="flip-card-face flip-card-back bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-7">
            <div className="flex flex-col items-center mb-5">
              <img
                src="/sunbot-feliz.png"
                alt="Windmar AI"
                className="mascot-img w-16 h-16 object-contain mb-2"
                style={{ imageRendering: 'pixelated' }}
              />
              <h1 className="text-lg font-bold text-[#1B3A5C] dark:text-white">Crea tu cuenta</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Bienvenido al equipo Windmar</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-3">
              {/* Nombre */}
              <FieldLabel text="Nombre completo" />
              <FieldWrap valid={nombreOk} touched={regNombre.length > 0}>
                <input
                  type="text"
                  value={regNombre}
                  onChange={(e) => setRegNombre(e.target.value)}
                  placeholder="Juan Pérez"
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#1e293b] dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-4 py-2 pr-9 text-sm focus:outline-none focus:border-[#F7941D] transition-colors"
                />
              </FieldWrap>

              {/* Correo */}
              <FieldLabel text="Correo corporativo" />
              <FieldWrap valid={regEmailOk} touched={regEmail.length > 0}>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value.toLowerCase())}
                  placeholder="nombre@windmarhome.com"
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#1e293b] dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-4 py-2 pr-9 text-sm focus:outline-none focus:border-[#F7941D] transition-colors"
                />
              </FieldWrap>

              {/* Departamento + Rol — fila */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel text="Departamento" />
                  <select
                    value={regDepartamento}
                    onChange={(e) => setRegDepartamento(e.target.value)}
                    required
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#1e293b] dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#F7941D] transition-colors cursor-pointer"
                  >
                    <option value="" disabled>Selecciona</option>
                    {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel text="Rol" />
                  <select
                    value={regRol}
                    onChange={(e) => setRegRol(e.target.value)}
                    required
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#1e293b] dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#F7941D] transition-colors cursor-pointer"
                  >
                    <option value="" disabled>Selecciona</option>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* Contraseña */}
              <FieldLabel text="Contraseña" />
              <div className="relative">
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#1e293b] dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-4 py-2 pr-11 text-sm focus:outline-none focus:border-[#F7941D] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                >
                  {showRegPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Strength bar */}
              {regPassword.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${(strength.level / 3) * 100}%`,
                        background: strength.color,
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}

              {/* Confirmar */}
              <FieldLabel text="Confirmar contraseña" />
              <FieldWrap valid={passwordsMatch} touched={regPasswordConfirm.length > 0}>
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  value={regPasswordConfirm}
                  onChange={(e) => setRegPasswordConfirm(e.target.value)}
                  placeholder="Repite la contraseña"
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#1e293b] dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-4 py-2 pr-9 text-sm focus:outline-none focus:border-[#F7941D] transition-colors"
                />
              </FieldWrap>
              {regPasswordConfirm.length > 0 && !passwordsMatch && (
                <p className="text-[11px] text-red-500 -mt-1">Las contraseñas no coinciden</p>
              )}

              {/* Términos */}
              <label className="flex items-start gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={regAcceptTerms}
                  onChange={(e) => setRegAcceptTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#F7941D] cursor-pointer"
                />
                <span className="text-[11px] text-gray-600 dark:text-gray-400 leading-snug">
                  Acepto los{' '}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }}
                    className="text-[#F7941D] font-medium hover:underline"
                  >
                    términos de uso
                  </button>{' '}
                  y entiendo que debo validar la información en las herramientas oficiales.
                </span>
              </label>

              {error && flipped && (
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !formValid}
                className="w-full bg-[#F7941D] hover:bg-[#e8830d] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-sm font-semibold transition-colors cursor-pointer"
              >
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </form>

            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={toggleFlip}
                className="text-[#F7941D] font-medium hover:underline cursor-pointer"
              >
                Inicia sesión
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Modal de términos */}
      {showTermsModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowTermsModal(false)}
        >
          <div
            className="bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1B3A5C] dark:text-white">Términos de uso</h3>
              <button
                onClick={() => setShowTermsModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-sans">
              {TERMS_TEXT}
            </pre>
            <button
              onClick={() => setShowTermsModal(false)}
              className="mt-5 w-full bg-[#F7941D] hover:bg-[#e8830d] text-white rounded-xl py-2.5 text-sm font-semibold transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* CSS — Flip card 3D */}
      <style>{`
        .flip-card {
          perspective: 1800px;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          min-height: 720px;
          transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.7s ease;
          transform-style: preserve-3d;
        }
        .flip-card-inner.flipped {
          transform: rotateY(180deg);
        }
        .flip-card-face {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .flip-card-back {
          transform: rotateY(180deg);
        }
        /* Sombra dinámica durante flip */
        .flip-card-inner {
          box-shadow: 0 8px 28px rgba(27,58,92,0.10);
        }
        .flip-card-inner:hover {
          box-shadow: 0 14px 40px rgba(247,148,29,0.18), 0 8px 28px rgba(27,58,92,0.10);
        }
        @media (max-width: 480px) {
          .flip-card-inner { min-height: 760px; }
        }
      `}</style>
    </div>
  );
}

// ---------------- Helpers visuales ----------------

function FieldLabel({ text }: { text: string }) {
  return (
    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">{text}</label>
  );
}

function FieldWrap({
  children,
  valid,
  touched,
}: {
  children: React.ReactNode;
  valid: boolean;
  touched: boolean;
}) {
  return (
    <div className="relative">
      {children}
      {touched && valid && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
    </div>
  );
}
