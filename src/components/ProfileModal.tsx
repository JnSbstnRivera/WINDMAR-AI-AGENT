'use client';

import { useState } from 'react';

interface UserData {
  email: string;
  displayName?: string | null;
  departamento?: string | null;
  rol?: string | null;
}

interface Props {
  user: UserData;
  onClose: () => void;
  onSaved: () => void;
}

const DEPARTAMENTOS = ['Telemercadeo', 'Ventas', 'Vass', 'Calidad'];
const ROLES = ['Asesor', 'Líder', 'Channel', 'Project M'];

function isValidDisplayName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 30) return false;
  return /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'\-]+$/.test(trimmed);
}

function capitalizeName(name: string): string {
  return name.trim().toLowerCase().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function ProfileModal({ user, onClose, onSaved }: Props) {
  const [displayName, setDisplayName] = useState(user.displayName ?? '');
  const [departamento, setDepartamento] = useState(user.departamento ?? '');
  const [rol, setRol] = useState(user.rol ?? '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const nameOk = isValidDisplayName(displayName);
  const formValid = nameOk && departamento && rol;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: capitalizeName(displayName),
          departamento,
          rol,
        }),
      });
      if (!res.ok) {
        setError('No pudimos guardar los cambios. Intenta de nuevo.');
      } else {
        setSaved(true);
        onSaved();
        setTimeout(() => onClose(), 900);
      }
    } catch {
      setError('Error de conexión. Verifica tu internet.');
    }
    setLoading(false);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <img
              src="/sunbot-feliz.png"
              alt="SUN BOT"
              className="mascot-img w-9 h-9 object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
            <h3 className="text-lg font-bold text-[#1B3A5C] dark:text-white">Mi perfil</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
            aria-label="Cerrar"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mb-3">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
            Correo corporativo
          </label>
          <p className="text-sm text-gray-500 dark:text-gray-400 px-3 py-2 bg-gray-50 dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-700">
            {user.email}
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
              ¿Cómo quieres que te llame?
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ej: Juan, Carlos, Don Pepe..."
              maxLength={30}
              required
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#1e293b] dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#F7941D] transition-colors"
            />
            {displayName.length > 0 && !nameOk && (
              <p className="text-[11px] text-red-500 mt-1">
                Solo letras y espacios, entre 2 y 30 caracteres
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Departamento</label>
              <select
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
                required
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#1e293b] dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#F7941D] transition-colors cursor-pointer"
              >
                <option value="" disabled>Selecciona</option>
                {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Rol</label>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value)}
                required
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#1e293b] dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#F7941D] transition-colors cursor-pointer"
              >
                <option value="" disabled>Selecciona</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
          )}
          {saved && (
            <p className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Cambios guardados
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-[#1e293b] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !formValid || saved}
              className="flex-1 bg-[#F7941D] hover:bg-[#e8830d] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-sm font-semibold transition-colors cursor-pointer"
            >
              {loading ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
