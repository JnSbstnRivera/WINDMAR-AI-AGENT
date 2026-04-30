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

// Valida nombre/apodo: 2-30 chars, solo letras (con acentos), espacios, guiones y apóstrofes
function isValidDisplayName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 30) return false;
  // Solo letras (incluye acentos), espacios, guiones, apóstrofes
  return /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'\-]+$/.test(trimmed);
}

// Capitaliza la primera letra de cada palabra
function capitalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Shared
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const nombreOk = isValidDisplayName(regNombre);
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

  function handleRegisterClick(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid) return;
    setError('');
    setShowConfirmModal(true);
  }

  async function confirmRegister() {
    setShowConfirmModal(false);
    setLoading(true);
    const finalName = capitalizeName(regNombre);
    const cleanEmail = regEmail.trim().toLowerCase();
    const { data, error: err } = await supabase.auth.signUp({
      email: cleanEmail,
      password: regPassword,
      options: {
        data: {
          display_name: finalName,
          departamento: regDepartamento,
          rol: regRol,
          terms_version: TERMS_VERSION,
          terms_accepted_at: new Date().toISOString(),
        },
      },
    });

    // Supabase puede:
    // 1) Devolver error explícito "User already registered" (config con email confirmation off)
    // 2) Devolver data.user pero sin user.identities[] (email ya existe pero confirmación pendiente)
    if (err) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user_already_exists')) {
        setError('Este correo ya está en uso. Intenta iniciar sesión o recupera tu contraseña.');
      } else if (msg.includes('invalid email')) {
        setError('Correo no válido.');
      } else if (msg.includes('password')) {
        setError('La contraseña no cumple los requisitos.');
      } else {
        setError('No pudimos crear tu cuenta. Intenta de nuevo en unos segundos.');
      }
    } else if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      // Email ya estaba registrado — Supabase devolvió "fake" user sin identidades
      setError('Este correo ya está en uso. Intenta iniciar sesión o recupera tu contraseña.');
    } else {
      setRegistered(true);
    }
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
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#1e293b] dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#F7941D] transition-colors"
              />
            </div>
            {error && (
              <div className="animate-fade-in flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-3 py-2.5 rounded-lg font-medium">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{error}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#F7941D] hover:bg-[#e8830d] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors cursor-pointer"
            >
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>
          </form>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a1628] px-3 py-3">
      <div className="flip-card w-full max-w-md">
        <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
          {/* ============== FRONTAL — LOGIN ============== */}
          <div className="flip-card-face flip-card-front bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 sm:p-6">
            <div className="flex flex-col items-center mb-5">
              <img
                src="/sunbot.png"
                alt="Windmar AI"
                className="mascot-img w-16 h-16 object-contain mb-2"
                style={{ imageRendering: 'pixelated' }}
              />
              <h1 className="text-lg font-bold text-[#1B3A5C] dark:text-white">Agente Windmar Home</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Inicia sesión para continuar</p>
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
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#1e293b] dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#F7941D] transition-colors"
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
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#1e293b] dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-3.5 py-2 pr-11 text-sm focus:outline-none focus:border-[#F7941D] transition-colors"
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
                <div className="animate-fade-in flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-3 py-2.5 rounded-lg font-medium">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span>{error}</span>
                </div>
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

            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
              ¿No tienes cuenta?{' '}
              <button
                type="button"
                onClick={toggleFlip}
                className="text-[#F7941D] font-medium hover:underline cursor-pointer"
              >
                Regístrate
              </button>
            </p>

            {/* Logo Windmar Home decorativo abajo (con brillo blanco + partículas amarillas) */}
            <div className="login-logo-wrap mt-4 flex items-center justify-center">
              <div className="relative" style={{ width: 260, height: 170 }}>
                <img
                  src="/logo-inicial-chat.png"
                  alt="Windmar Home"
                  className="login-bottom-logo absolute inset-0 w-full h-full object-contain"
                />
                {/* Partículas amarillas flotantes */}
                <span className="login-particle login-particle-1" />
                <span className="login-particle login-particle-2" />
                <span className="login-particle login-particle-3" />
                <span className="login-particle login-particle-4" />
              </div>
            </div>
          </div>

          {/* ============== TRASERA — REGISTRO ============== */}
          <div className="flip-card-face flip-card-back bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/sunbot-feliz.png"
                alt="Windmar AI"
                className="mascot-img w-12 h-12 object-contain flex-shrink-0"
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="leading-tight">
                <h1 className="text-base font-bold text-[#1B3A5C] dark:text-white">Crea tu cuenta</h1>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Bienvenido al equipo Windmar</p>
              </div>
            </div>

            <form onSubmit={handleRegisterClick} className="space-y-2.5">
              {/* ¿Cómo te llamamos? */}
              <FieldLabel text="¿Cómo quieres que te llame?" />
              <FieldWrap valid={nombreOk} touched={regNombre.length > 0}>
                <input
                  type="text"
                  value={regNombre}
                  onChange={(e) => setRegNombre(e.target.value)}
                  placeholder="Ej: Andres, Andy, Don Andres..."
                  maxLength={30}
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#1e293b] dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-3.5 py-2 pr-9 text-sm focus:outline-none focus:border-[#F7941D] transition-colors"
                />
              </FieldWrap>
              <p className="text-[10px] text-gray-500 dark:text-gray-500 -mt-1 ml-1">
                Podrás cambiarlo más adelante desde tu perfil
              </p>
              {regNombre.length > 0 && !nombreOk && (
                <p className="text-[11px] text-red-500 -mt-1 ml-1">
                  Solo letras y espacios, entre 2 y 30 caracteres
                </p>
              )}

              {/* Correo */}
              <FieldLabel text="Correo corporativo" />
              <FieldWrap valid={regEmailOk} touched={regEmail.length > 0}>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value.toLowerCase())}
                  placeholder="nombre@windmarhome.com"
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#1e293b] dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-3.5 py-2 pr-9 text-sm focus:outline-none focus:border-[#F7941D] transition-colors"
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
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#1e293b] dark:text-gray-100 rounded-xl px-2.5 py-2 text-sm focus:outline-none focus:border-[#F7941D] transition-colors cursor-pointer"
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
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#1e293b] dark:text-gray-100 rounded-xl px-2.5 py-2 text-sm focus:outline-none focus:border-[#F7941D] transition-colors cursor-pointer"
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
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#1e293b] dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-3.5 py-2 pr-11 text-sm focus:outline-none focus:border-[#F7941D] transition-colors"
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

              {/* Confirmar — aparece solo cuando hay contraseña escrita */}
              {regPassword.length > 0 && (
                <div className="space-y-1 animate-fade-in">
                  <FieldLabel text="Confirmar contraseña" />
                  <FieldWrap valid={passwordsMatch} touched={regPasswordConfirm.length > 0}>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPasswordConfirm}
                      onChange={(e) => setRegPasswordConfirm(e.target.value)}
                      placeholder="Repite la contraseña"
                      required
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#1e293b] dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-3.5 py-2 pr-9 text-sm focus:outline-none focus:border-[#F7941D] transition-colors"
                    />
                  </FieldWrap>
                  {regPasswordConfirm.length > 0 && !passwordsMatch && (
                    <p className="text-[11px] text-red-500">Las contraseñas no coinciden</p>
                  )}
                </div>
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
                <div className="animate-fade-in flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-3 py-2.5 rounded-lg font-medium">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span>{error}</span>
                </div>
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

      {/* Modal de confirmación de nombre */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src="/sunbot-feliz.png"
              alt="SUN BOT"
              className="mascot-img w-20 h-20 object-contain mx-auto mb-3"
              style={{ imageRendering: 'pixelated' }}
            />
            <h3 className="text-lg font-bold text-[#1B3A5C] dark:text-white mb-2">
              ¿Confirmas?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
              A partir de ahora te llamaré
            </p>
            <p className="text-2xl font-bold text-[#F7941D] mb-5">
              {capitalizeName(regNombre)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-[#1e293b] transition-colors cursor-pointer"
              >
                Editar
              </button>
              <button
                onClick={confirmRegister}
                disabled={loading}
                className="flex-1 bg-[#F7941D] hover:bg-[#e8830d] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors cursor-pointer"
              >
                {loading ? 'Creando...' : 'Sí, crear cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}

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
        /* Flip card con grid stacking — ambas caras se apilan en la misma celda
           y el grid toma la altura de la cara más alta (auto-ajuste) */
        .flip-card {
          perspective: 1800px;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          display: grid;
          grid-template-columns: 1fr;
          transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.7s ease;
          transform-style: preserve-3d;
          box-shadow: 0 8px 28px rgba(27,58,92,0.10);
        }
        .flip-card-inner.flipped {
          transform: rotateY(180deg);
        }
        .flip-card-inner:hover {
          box-shadow: 0 14px 40px rgba(247,148,29,0.18), 0 8px 28px rgba(27,58,92,0.10);
        }
        .flip-card-face {
          grid-column: 1;
          grid-row: 1;
          width: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .flip-card-back {
          transform: rotateY(180deg);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.25s ease-out;
        }

        /* Logo decorativo abajo del login — glow blanco en silueta */
        @keyframes loginLogoGlow {
          0%, 100% {
            filter: drop-shadow(0 0 5px rgba(255,255,255,0.65))
                    drop-shadow(0 0 12px rgba(255,255,255,0.35));
            transform: translateY(0);
          }
          50% {
            filter: drop-shadow(0 0 9px rgba(255,255,255,0.95))
                    drop-shadow(0 0 18px rgba(255,255,255,0.55));
            transform: translateY(-3px);
          }
        }
        .login-bottom-logo {
          animation: loginLogoGlow 3.4s ease-in-out infinite;
          opacity: 0.85;
        }

        /* Partículas amarillas flotantes */
        @keyframes loginParticleFloat {
          0%   { transform: translate(0, 0) scale(0.4); opacity: 0; }
          15%  { opacity: 0.85; }
          50%  { transform: translate(var(--px, 0), -32px) scale(1); opacity: 0.7; }
          100% { transform: translate(var(--px, 0), -60px) scale(0.3); opacity: 0; }
        }
        .login-particle {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgb(253,224,71);
          box-shadow: 0 0 8px rgba(253,224,71,0.95), 0 0 16px rgba(253,224,71,0.55);
          opacity: 0;
          pointer-events: none;
          z-index: 5;
        }
        .login-particle-1 {
          left: 20%; bottom: 18%;
          --px: -4px;
          animation: loginParticleFloat 3.2s ease-in-out 0s infinite;
        }
        .login-particle-2 {
          left: 45%; bottom: 8%;
          --px: 3px;
          animation: loginParticleFloat 3.6s ease-in-out 0.7s infinite;
          width: 3px; height: 3px;
        }
        .login-particle-3 {
          left: 70%; bottom: 16%;
          --px: 6px;
          animation: loginParticleFloat 3.4s ease-in-out 1.4s infinite;
        }
        .login-particle-4 {
          left: 84%; bottom: 6%;
          --px: 4px;
          animation: loginParticleFloat 3.8s ease-in-out 2.1s infinite;
          width: 3px; height: 3px;
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
