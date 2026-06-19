'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface UserOpt { name: string; email: string }

/**
 * Buscador de owner en UN SOLO campo: escribes y filtra en vivo la lista de
 * usuarios Zoho; al elegir uno, devuelve su correo (onPick). Sin botón aparte ni
 * segundo input. Cierra al hacer clic fuera.
 */
export function OwnerSelect({
  users,
  onPick,
  loading,
  placeholder = 'Elige o busca un owner…',
}: {
  users: UserOpt[];
  value?: string;
  onPick: (email: string, name: string) => void;
  loading?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = t ? users.filter((u) => u.name.toLowerCase().includes(t) || u.email.toLowerCase().includes(t)) : users;
    return base.slice(0, 200);
  }, [users, q]);

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 320 }}>
      <span style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text3)', fontSize: 13, pointerEvents: 'none' }}>🔍</span>
      <input
        value={q}
        disabled={loading}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={(e) => { setOpen(true); e.target.select(); }}
        placeholder={placeholder}
        style={{
          width: '100%', background: '#0f1525', color: '#E8EAF0',
          border: `1px solid ${open ? '#38bdf8' : 'var(--glass-border)'}`,
          borderRadius: 8, padding: '8px 28px 8px 30px', fontSize: 13,
        }}
      />
      <span style={{ position: 'absolute', right: 10, top: 9, color: 'var(--text3)', opacity: 0.6, pointerEvents: 'none' }}>▾</span>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 60, width: 'min(420px, 92vw)',
            background: 'var(--bg1, #0c1322)', border: '1px solid var(--glass-border)', borderRadius: 10,
            boxShadow: '0 14px 40px rgba(0,0,0,0.5)', padding: 6,
          }}
        >
          <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ color: 'var(--text3)', fontSize: 12, padding: '10px 12px' }}>Sin coincidencias.</div>
            ) : filtered.map((u) => (
              <button
                key={u.email}
                type="button"
                onClick={() => { onPick(u.email, u.name); setQ(u.name); setOpen(false); }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1, textAlign: 'left',
                  padding: '8px 10px', borderRadius: 7, cursor: 'pointer', border: 'none', background: 'transparent',
                  color: 'var(--text1)', fontSize: 13,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontWeight: 600 }}>{u.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{u.email}</span>
              </button>
            ))}
          </div>
          <div style={{ color: 'var(--text3)', fontSize: 11, padding: '6px 10px 2px' }}>{filtered.length} de {users.length} usuarios</div>
        </div>
      )}
    </div>
  );
}
