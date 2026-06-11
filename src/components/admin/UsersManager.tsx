'use client';

import { useMemo, useState } from 'react';

export interface AdminUser {
  user_email: string;
  display_name: string | null;
  departamento: string | null;
  rol: string;
  status: 'pending' | 'active' | 'rejected' | 'suspended';
  is_superadmin: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  photo_url?: string | null;
}

const ROLES = ['Asesor', 'Líder', 'Channel', 'Project M', 'Admin'];

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  active: 'Activo',
  rejected: 'Rechazado',
  suspended: 'Suspendido',
};
const STATUS_COLOR: Record<string, string> = {
  pending: '#F7941D',
  active: '#22c55e',
  rejected: '#ef4444',
  suspended: '#a78bfa',
};

function initials(name: string | null, email: string) {
  const base = (name || email.split('@')[0]).trim();
  return base.slice(0, 2).toUpperCase();
}

export function UsersManager({ initialUsers }: { initialUsers: AdminUser[] }) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = useMemo(() => users.filter((u) => u.status === 'pending'), [users]);
  const rest = useMemo(() => users.filter((u) => u.status !== 'pending'), [users]);

  async function act(email: string, action: string, rol?: string) {
    setBusy(email + action);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action, rol }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Error');
        return;
      }
      // Reflejar el cambio localmente
      setUsers((prev) =>
        prev.map((u) => {
          if (u.user_email !== email) return u;
          if (action === 'approve') return { ...u, status: 'active', rol: rol || u.rol };
          if (action === 'reject') return { ...u, status: 'rejected' };
          if (action === 'suspend') return { ...u, status: 'suspended' };
          if (action === 'reactivate') return { ...u, status: 'active' };
          if (action === 'set-role' && rol) return { ...u, rol };
          return u;
        })
      );
    } catch {
      setError('Error de conexión');
    } finally {
      setBusy(null);
    }
  }

  const card: React.CSSProperties = {
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 14,
    padding: '14px 16px',
  };

  return (
    <div style={{ marginTop: 8 }}>
      <h1
        style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--text1)', margin: '0 0 4px' }}
      >
        Usuarios y accesos
      </h1>
      <p style={{ color: 'var(--text2)', fontSize: 13, margin: '0 0 20px' }}>
        Aprueba o rechaza ingresos nuevos y administra los roles del equipo.
      </p>

      {error && (
        <div
          style={{ ...card, borderColor: '#ef4444', color: '#ef4444', marginBottom: 16, fontSize: 13 }}
        >
          {error}
        </div>
      )}

      {/* ── Pendientes de aprobar ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: 'var(--text1)', fontSize: 16 }}>
            Pendientes de aprobar
          </span>
          <span
            style={{
              fontSize: 12, fontWeight: 700, color: pending.length ? '#1B3A5C' : 'var(--text2)',
              background: pending.length ? '#F7941D' : 'var(--glass-border)',
              borderRadius: 999, padding: '1px 9px',
            }}
          >
            {pending.length}
          </span>
        </div>

        {pending.length === 0 ? (
          <div style={{ ...card, color: 'var(--text2)', fontSize: 13 }}>
            No hay solicitudes pendientes. 🎉
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {pending.map((u) => (
              <div key={u.user_email} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 220 }}>
                  <Avatar user={u} />
                  <div>
                    <div style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 14 }}>
                      {u.display_name || u.user_email.split('@')[0]}
                    </div>
                    <div style={{ color: 'var(--text2)', fontSize: 12 }}>
                      {u.user_email} · {u.departamento || 'sin depto'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => act(u.user_email, 'approve', 'Asesor')}
                    disabled={!!busy}
                    style={btn('#22c55e')}
                  >
                    Aprobar · Asesor
                  </button>
                  <button
                    onClick={() => act(u.user_email, 'approve', 'Líder')}
                    disabled={!!busy}
                    style={btn('#F7941D')}
                  >
                    Aprobar · Líder
                  </button>
                  <button
                    onClick={() => act(u.user_email, 'reject')}
                    disabled={!!busy}
                    style={btn('#ef4444', true)}
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Todos los usuarios ── */}
      <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: 'var(--text1)', fontSize: 16, marginBottom: 12 }}>
        Equipo ({rest.length})
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {rest.map((u) => (
          <div key={u.user_email} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 220 }}>
              <Avatar user={u} />
              <div>
                <div style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {u.display_name || u.user_email.split('@')[0]}
                  {u.is_superadmin && (
                    <span style={{ fontSize: 10, color: '#F7941D', border: '1px solid #F7941D', borderRadius: 5, padding: '0 5px' }}>
                      ADMIN
                    </span>
                  )}
                </div>
                <div style={{ color: 'var(--text2)', fontSize: 12 }}>{u.user_email}</div>
              </div>
            </div>

            <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLOR[u.status] }}>
              {STATUS_LABEL[u.status]}
            </span>

            <select
              value={u.rol}
              disabled={!!busy || u.is_superadmin}
              onChange={(e) => act(u.user_email, 'set-role', e.target.value)}
              style={{
                background: '#0f1525', color: '#E8EAF0',
                border: '1px solid var(--glass-border)', borderRadius: 8,
                padding: '6px 8px', fontSize: 12,
              }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r} style={{ background: '#0f1525', color: '#E8EAF0' }}>
                  {r}
                </option>
              ))}
            </select>

            {!u.is_superadmin &&
              (u.status === 'suspended' || u.status === 'rejected' ? (
                <button onClick={() => act(u.user_email, 'reactivate')} disabled={!!busy} style={btn('#22c55e', true)}>
                  Reactivar
                </button>
              ) : (
                <button onClick={() => act(u.user_email, 'suspend')} disabled={!!busy} style={btn('#a78bfa', true)}>
                  Suspender
                </button>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Avatar({ user }: { user: AdminUser }) {
  if (user.photo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={user.photo_url}
        alt=""
        style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--glass-border)' }}
      />
    );
  }
  return (
    <div
      style={{
        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(247,148,29,0.18)', color: '#F7941D',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 13,
      }}
    >
      {initials(user.display_name, user.user_email)}
    </div>
  );
}

function btn(color: string, outline = false): React.CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 600,
    padding: '7px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    border: `1px solid ${color}`,
    background: outline ? 'transparent' : color,
    color: outline ? color : '#0c1322',
    transition: 'opacity .15s',
  };
}
