/**
 * Allowlist server-side para acceso al Dashboard administrativo.
 *
 * SEGURIDAD: este chequeo es INMUNE a cambios de perfil del usuario.
 * Aunque un asesor se ponga rol "Project M" desde el ProfileModal,
 * NO podrá entrar a /admin porque la validación va por EMAIL (no rol).
 *
 * ESTRATEGIA: los HARDCODED_ADMINS están SIEMPRE garantizados (defense
 * in depth). La env var ADMIN_EMAILS SUMA admins adicionales sin reemplazar
 * los hardcoded — así nunca se pierde acceso si la env var se borra/cambia.
 *
 * Para agregar más admins SIN tocar código:
 *   Vercel → Settings → Environment Variables → ADMIN_EMAILS
 *   Formato: emails separados por coma
 */

// Admins permanentes — hardcoded para garantía total de acceso.
// Para QUITAR uno de aquí, hay que modificar este archivo (deploy).
const HARDCODED_ADMINS = [
  'juan.s@windmarhome.com',
  'a.rengifo@windmarhome.com',
  'jesus.castro@windmarhome.com',
  'd.buitrago@windmarhome.com',
  'd.riano@windmarhome.com',
];

function getAdminEmails(): Set<string> {
  const fromEnv = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  // Unión: hardcoded + env var (Set elimina duplicados automáticamente)
  return new Set([...HARDCODED_ADMINS.map((e) => e.toLowerCase()), ...fromEnv]);
}

/**
 * @returns true si el email está autorizado para entrar al dashboard.
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = getAdminEmails();
  return allowlist.has(email.toLowerCase());
}

/**
 * Lista de correos de los admins (hardcoded + env), en minúsculas.
 * Usada para enviar la notificación de "nuevo acceso solicitado".
 */
export function getAdminEmailList(): string[] {
  return Array.from(getAdminEmails());
}

/**
 * ¿Este email puede APROBAR / RECHAZAR accesos nuevos?
 * Decisión del proyecto: cualquier Admin (de la allowlist) puede aprobar.
 * Va por EMAIL (no por rol) → inmune a que alguien se auto-asigne un rol.
 */
export function canApproveAccess(email: string | null | undefined): boolean {
  return isAdmin(email);
}
