import { useState, useEffect } from 'react';

interface Props {
  onLogout: () => void;
  onOpenProfile?: () => void;
  displayName?: string;
}

export function TopBar({ onLogout, onOpenProfile, displayName }: Props) {
  // Por defecto modo oscuro — guardado en localStorage
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('wh-theme');
    return saved === null ? true : saved === 'dark';
  });
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('wh-theme', dark ? 'dark' : 'light'); } catch {}
  }, [dark]);

  function toggleDark() {
    setSpinning(true);
    setDark(d => !d);
    setTimeout(() => setSpinning(false), 400);
  }

  return (
    <div className="fixed top-3 right-4 z-40 flex items-center gap-2">
      {/* Configuración / Perfil */}
      {onOpenProfile && (
        <button
          onClick={onOpenProfile}
          title={displayName ? `Configuración (${displayName})` : 'Configuración'}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-600 shadow-sm hover:border-[#F7941D] hover:text-[#F7941D] text-gray-500 dark:text-gray-300 transition-colors cursor-pointer"
          aria-label="Configuración"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>
      )}

      {/* Tema */}
      <button
        onClick={toggleDark}
        title={dark ? 'Modo claro' : 'Modo oscuro'}
        className="w-9 h-9 rounded-full flex items-center justify-center bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-600 shadow-sm hover:border-[#F7941D] transition-colors cursor-pointer"
      >
        <span
          style={{
            display: 'inline-block',
            transition: 'transform 0.4s ease',
            transform: spinning ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          {dark ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F7941D" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1"  x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1"  y1="12" x2="3"  y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36"/>
              <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1B3A5C" strokeWidth="2" strokeLinecap="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          )}
        </span>
      </button>

      <button
        onClick={onLogout}
        title="Cerrar sesión"
        className="flex items-center gap-1.5 px-3 h-9 rounded-full bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-600 shadow-sm hover:border-red-400 hover:text-red-500 text-gray-500 dark:text-gray-300 text-xs font-medium transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Salir
      </button>
    </div>
  );
}
