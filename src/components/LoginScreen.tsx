import { useState } from 'react';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'register';

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.endsWith('@windmarhome.com')) {
      setError('Solo se permiten correos corporativos @windmarhome.com');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener mínimo 6 caracteres');
      return;
    }

    setLoading(true);

    if (mode === 'register') {
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) {
        setError(err.message);
      } else {
        setRegistered(true);
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError('Correo o contraseña incorrectos');
      }
    }

    setLoading(false);
  }

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
              <path d="M20 6L9 17L4 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Revisa tu correo</h2>
          <p className="text-sm text-gray-500 mb-6">
            Te enviamos un enlace de confirmación a <strong>{email}</strong>. Confírmalo y luego inicia sesión.
          </p>
          <button
            onClick={() => { setMode('login'); setRegistered(false); }}
            className="text-[#F7941D] text-sm font-medium hover:underline cursor-pointer"
          >
            Ir al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <svg width="56" height="56" viewBox="0 0 80 80" fill="none" className="mb-3">
            <circle cx="40" cy="40" r="40" fill="#F7941D" />
            <path d="M40 12 L44 27 L60 27 L47 36 L52 51 L40 42 L28 51 L33 36 L20 27 L36 27 Z" fill="white" />
          </svg>
          <h1 className="text-xl font-bold text-[#1B3A5C]">Agente IA Windmar</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'login' ? 'Inicia sesión para continuar' : 'Crea tu cuenta de asesor'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Correo corporativo
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@windmarhome.com"
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F7941D] transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F7941D] transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#F7941D] hover:bg-[#e8830d] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors cursor-pointer"
          >
            {loading ? 'Cargando...' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="text-[#F7941D] font-medium hover:underline cursor-pointer"
          >
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  );
}
