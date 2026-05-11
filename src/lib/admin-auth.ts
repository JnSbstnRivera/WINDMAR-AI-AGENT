/**
 * Allowlist server-side para acceso al Dashboard administrativo.
 *
 * SEGURIDAD: este chequeo es INMUNE a cambios de perfil del usuario.
 * Aunque un asesor se ponga rol "Project M" desde el ProfileModal,
 * NO podrá entrar a /admin porque la validación va por EMAIL (no rol).
 *
 * Para agregar/quitar admins:
 *   Vercel → Settings → Environment Variables → ADMIN_EMAILS
 *   Formato: emails separados por coma, ej:
 *     ADMIN_EMAILS=juan.s@windmarhome.com,otro@windmarhome.com
 *
 * Fallback: si la env var no existe (deploy nuevo, error de config),
 * mantiene a juan.s@windmarhome.com como admin para no perder el acceso.
 */

const FALLBACK_ADMIN = 'juan.s@windmarhome.com';

function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS || FALLBACK_ADMIN;
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * @returns true si el email está autorizado para entrar al dashboard.
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = getAdminEmails();
  return allowlist.has(email.toLowerCase());
}
