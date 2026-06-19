'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Props {
  pendingCount: number;
  signOutAction: () => void;
}

const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/gestion', label: 'Gestión (chat agente)', accent: true },
  { href: '/admin/usuarios', label: 'Usuarios y accesos', badge: true },
  { href: '/admin/asignar', label: 'Asignar leads' },
  { href: '/admin/actividad', label: 'Actividad de admins' },
  { href: '/admin/zoho', label: 'Zoho — config y salud' },
  { href: '/admin/auditoria', label: 'Auditoría' },
  { href: '/', label: 'Volver al chat' },
];

/**
 * Navegación del admin como PANEL IZQUIERDO fijo, transparente (vidrio) con neon
 * glow. En móvil se colapsa a un botón ☰ que despliega el panel.
 */
export function AdminSidebar({ pendingCount, signOutAction }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false); // móvil

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : href !== '/' && pathname.startsWith(href);

  return (
    <>
      {/* Botón móvil */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="md:hidden fixed top-4 left-4 z-[60] ad-mono text-[11px] px-3 py-2 rounded-lg"
        style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text1)' }}
        aria-label="Menú"
      >☰ Menú</button>

      {open && <div className="md:hidden fixed inset-0 z-[58]" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setOpen(false)} />}

      <aside
        className={`ad-sidebar fixed inset-y-0 left-0 z-[59] flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        style={{
          width: 232,
          background: 'rgba(10,16,30,0.34)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          borderRight: '1px solid rgba(247,148,29,0.28)',
          boxShadow: '0 0 40px rgba(247,148,29,0.10), inset -1px 0 0 rgba(255,255,255,0.04)',
          padding: '18px 12px',
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5" style={{ marginBottom: 18, padding: '0 6px' }}>
          <img src="/sunbot-feliz.png" alt="SUN BOT" style={{ width: 38, height: 38, objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(247,148,29,0.6))' }} />
          <div style={{ lineHeight: 1.1 }}>
            <div className="ad-mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', letterSpacing: '0.06em' }}>WINDMAR</div>
            <div className="ad-mono" style={{ fontSize: 9, color: '#F7941D', letterSpacing: '0.14em' }}>ADMIN</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1" style={{ flex: 1 }}>
          {LINKS.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="ad-side-link ad-mono"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 9,
                  fontSize: 11.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none',
                  color: active ? '#F7941D' : l.accent ? '#F7941D' : 'var(--text1)',
                  background: active ? 'rgba(247,148,29,0.14)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(247,148,29,0.45)' : 'transparent'}`,
                  boxShadow: active ? '0 0 16px rgba(247,148,29,0.25)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ flex: 1 }}>{l.label}</span>
                {l.badge && pendingCount > 0 && (
                  <span style={{ minWidth: 18, height: 18, padding: '0 5px', fontSize: 10, fontWeight: 700, background: '#F7941D', color: '#1B3A5C', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{pendingCount}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <form action={signOutAction} style={{ marginTop: 8 }}>
          <button
            type="submit"
            className="ad-mono"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '11px 12px', borderRadius: 9, fontSize: 11.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', color: '#ef4444' }}
          >
            Cerrar sesión
          </button>
        </form>
      </aside>

      <style>{`.ad-side-link:hover { background: rgba(255,255,255,0.06) !important; }`}</style>
    </>
  );
}
