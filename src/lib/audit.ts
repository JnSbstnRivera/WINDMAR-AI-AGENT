import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Registra una acción sensible en admin_audit (best-effort).
 * Nunca lanza: si el log falla, la acción principal no se rompe.
 */
export async function logAudit(
  actorEmail: string,
  action: string,
  target: string | null,
  detail?: Record<string, unknown>
): Promise<void> {
  try {
    await getSupabaseAdmin().from('admin_audit').insert({
      actor_email: actorEmail,
      action,
      target,
      detail: detail ?? null,
    });
  } catch (err) {
    console.error('[audit] no se pudo registrar', action, (err as Error).message);
  }
}
