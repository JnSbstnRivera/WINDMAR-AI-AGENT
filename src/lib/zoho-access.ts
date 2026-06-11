// ════════════════════════════════════════
// SCOPING DE ZOHO POR DUEÑO — "cada asesor ve solo lo suyo"
// ════════════════════════════════════════
// Regla central, aplicada en TODOS los endpoints de Zoho (/search, /client,
// /coach) para que un Asesor solo pueda ver los leads de los que es Owner.
//
// - Asesor                       → solo leads donde ownerEmail === su correo.
// - Líder / Channel / Project M  → ven todo (gestionan/asignan).
// - Admin (allowlist por email)  → ven todo.
//
// El correo de Microsoft 365 coincide con el Owner.email de Zoho, así que el
// filtro es una comparación directa de correos (sin tabla de mapeo).
//
// NOTA (refinamiento futuro, Fase 5): "Líder ve solo su equipo" requiere definir
// el equipo (jerarquía Zoho o tabla propia). Por ahora Líder ve todo.

import { isAdmin } from '@/lib/admin-auth';

const ELEVATED_ROLES = new Set(['Líder', 'Channel', 'Project M', 'Admin']);

export interface ViewerScope {
  email: string;
  canSeeAll: boolean;
}

type SessionLike = {
  user?: { email?: string | null } | null;
} | null;

/** Deriva el alcance de visibilidad del usuario logueado. */
export function getViewerScope(session: SessionLike): ViewerScope {
  const user = (session?.user || {}) as Record<string, unknown>;
  const email = String(user.email || '').toLowerCase();
  const rol = typeof user.rol === 'string' ? user.rol : undefined;
  const canSeeAll = isAdmin(email) || (!!rol && ELEVATED_ROLES.has(rol));
  return { email, canSeeAll };
}

/**
 * ¿El usuario puede ESCRIBIR en Zoho (asignar, reasignar, notas)?
 * Mismo gate que ver-todo: solo roles elevados (Líder/Channel/Project M/Admin).
 * El Asesor es estrictamente solo-lectura.
 */
export function canWrite(scope: ViewerScope): boolean {
  return scope.canSeeAll;
}

/** ¿El usuario puede ver este lead? */
export function ownsLead(
  lead: { ownerEmail?: string | null },
  scope: ViewerScope
): boolean {
  if (scope.canSeeAll) return true;
  const owner = (lead.ownerEmail || '').toLowerCase();
  return !!owner && owner === scope.email;
}

/** Filtra una lista de leads a solo los que el usuario puede ver. */
export function filterOwnedLeads<T extends { ownerEmail?: string | null }>(
  leads: T[],
  scope: ViewerScope
): T[] {
  if (scope.canSeeAll) return leads;
  return leads.filter((l) => ownsLead(l, scope));
}

/** Mensaje estándar cuando un cliente existe pero no es del asesor. */
export const NOT_IN_PORTFOLIO_MSG =
  'Ese cliente existe en Zoho pero no está en tu cartera. Solo puedes ver los leads asignados a ti.';
