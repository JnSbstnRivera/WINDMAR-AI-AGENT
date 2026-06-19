'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface UserOpt { name: string; email: string }

/**
 * Combobox buscable de owners (estilo NOTAS-VENTAS-VASS / Telemercadeo):
 * clic → despliega la lista de nombres activos de Zoho + buscador que filtra.
 * Al elegir un nombre devuelve su correo (onPick). Cierra al hacer clic fuera.
 */
export function OwnerSelect({
  users,
  value,
  onPick,
  loading,
  placeholder = 'Elige o busca un owner…',
}: {
  users: UserOpt[];
  value: string; // correo seleccionado (para mostrar el nombre)
  onPick: (email: string, name: string) => void;
  loading?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = t ? users.filter((u) => u.name.toLowerCase().includes(t) || u.email.toLowerCase().includes(t)) : users;
    return base.slice(0, 200);
  }, [users, q]);

  const current = users.find((u) => u.email.toLowerCase() === value.toLowerCase());

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 300 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8, cursor: loading ? 'wait' : 'pointer',
          background: '#0f1525', color: current ? '#E8EAF0' : 'var(--text3)',
          border: `1px solid ${open ? '#38bdf8' : 'var(--glass-border)'}`, borderRadius: 8, padding: '8px 10px', fontSize: 13,
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current ? current.name : placeholder}
        </span>
        <span style={{ opacity: 0.6 }}>▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 60, width: 'min(420px, 92vw)',
            background: 'var(--bg1, #0c1322)', border: '1px solid var(--glass-border)', borderRadius: 10,
            boxShadow: '0 14px 40px rgba(0,0,0,0.5)', padding: 6,
          }}
        >
          <div style={{ position: 'relative', marginBottom: 6 }}>
            <span style={{ position: 'absolute', left: 9, top: 8, color: 'var(--text3)', fontSize: 13 }}>🔍</span>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar nombre o correo…"
              style={{ width: '100%', background: '#0f1525', color: '#E8EAF0', border: '1px solid var(--glass-border)', borderRadius: 8, padding: '8px 10px 8px 28px', fontSize: 13 }}
            />
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ color: 'var(--text3)', fontSize: 12, padding: '10px 12px' }}>Sin coincidencias.</div>
            ) : filtered.map((u) => {
              const active = current?.email === u.email;
              return (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => { onPick(u.email, u.name); setOpen(false); setQ(''); }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1, textAlign: 'left',
                    padding: '8px 10px', borderRadius: 7, cursor: 'pointer', border: 'none',
                    background: active ? 'rgba(247,148,29,0.18)' : 'transparent',
                    color: active ? '#F7941D' : 'var(--text1)', fontSize: 13,
                  }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget.style.background = 'rgba(255,255,255,0.06)'); }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget.style.background = 'transparent'); }}
                >
                  <span style={{ fontWeight: 600 }}>{u.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{u.email}</span>
                </button>
              );
            })}
          </div>
          <div style={{ color: 'var(--text3)', fontSize: 11, padding: '6px 10px 2px' }}>{filtered.length} de {users.length} usuarios</div>
        </div>
      )}
    </div>
  );
}
