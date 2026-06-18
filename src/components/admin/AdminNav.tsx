'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

interface Props {
  pendingCount: number;
  signOutAction: () => void;
}

const LINKS = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/gestion', label: 'Gestión (chat agente)', icon: '☀', accent: true },
  { href: '/admin/usuarios', label: 'Usuarios y accesos', icon: '👥', badge: true },
  { href: '/admin/asignar', label: 'Asignar leads', icon: '🎯' },
  { href: '/admin/actividad', label: 'Actividad de admins', icon: '📈' },
  { href: '/admin/zoho', label: 'Zoho — config y salud', icon: '⚙' },
  { href: '/admin/auditoria', label: 'Auditoría', icon: '🛡' },
  { href: '/', label: 'Volver al chat', icon: '←' },
];

/**
 * Menú del admin como dropdown (declutter del topbar). El logo Sun Bot y el
 * reloj/tema quedan en la barra; todas las secciones viven aquí dentro.
 */
export function AdminNav({ pendingCount, signOutAction }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const current = LINKS.find((l) => (l.href === '/admin' ? pathname === '/admin' : pathname.startsWith(l.href) && l.href !== '/'))?.label ?? 'Menú';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="ad-mono text-[10px] uppercase tracking-[0.15em] px-3 py-2 rounded-lg border transition-colors cursor-pointer flex items-center gap-2"
        style={{ color: 'var(--text1)', background: 'var(--glass-bg)', borderColor: open ? '#F7941D' : 'var(--glass-border)' }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span style={{ fontSize: 13 }}>☰</span>
        <span className="hidden sm:inline">{current}</span>
        <span style={{ opacity: 0.6 }}>▾</span>
        {pendingCount > 0 && !open && (
          <span style={{ minWidth: 16, height: 16, padding: '0 4px', fontSize: 10, fontWeight: 700, background: '#F7941D', color: '#1B3A5C', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{pendingCount}</span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 50, minWidth: 240,
            background: 'var(--bg1)', border: '1px solid var(--glass-border)', borderRadius: 12,
            boxShadow: '0 12px 36px rgba(0,0,0,0.45)', padding: 6, display: 'flex', flexDirection: 'column', gap: 2,
          }}
        >
          {LINKS.map((l) => {
            const active = l.href === '/admin' ? pathname === '/admin' : (l.href !== '/' && pathname.startsWith(l.href));
            return (
              <a
                key={l.href}
                href={l.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8,
                  fontSize: 13, textDecoration: 'none',
                  color: l.accent ? '#F7941D' : active ? '#F7941D' : 'var(--text1)',
                  background: active ? 'rgba(247,148,29,0.12)' : 'transparent',
                }}
              >
                <span style={{ width: 18, textAlign: 'center' }}>{l.icon}</span>
                <span style={{ flex: 1 }}>{l.label}</span>
                {l.badge && pendingCount > 0 && (
                  <span style={{ minWidth: 18, height: 18, padding: '0 5px', fontSize: 10, fontWeight: 700, background: '#F7941D', color: '#1B3A5C', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{pendingCount}</span>
                )}
              </a>
            );
          })}
          <div style={{ height: 1, background: 'var(--glass-border)', margin: '4px 0' }} />
          <form action={signOutAction}>
            <button
              type="submit"
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', textAlign: 'left' }}
            >
              <span style={{ width: 18, textAlign: 'center' }}>⎋</span>
              <span>Cerrar sesión</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
