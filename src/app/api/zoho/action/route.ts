import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  addLeadNote,
  updateLeadStatus,
  setLeadFollowup,
  getLeadBasic,
} from '@/lib/zoho';
import { getViewerScope, ownsLead, NOT_IN_PORTFOLIO_MSG } from '@/lib/zoho-access';
import { VALID_LEAD_STATUSES } from '@/lib/zoho-status';
import { logAudit } from '@/lib/audit';
import type { ZohoPendingAction } from '@/lib/zoho-actions';

export const runtime = 'nodejs';
export const maxDuration = 20;

/**
 * POST /api/zoho/action — EJECUTA una escritura previamente preparada por el
 * agente, tras el clic de confirmación del usuario.
 *
 * Disponible para TODOS los usuarios autenticados, pero SCOPED: el asesor solo
 * puede tocar SUS leads (se re-valida el dueño aquí — no se confía en el cliente).
 * Toda escritura queda en admin_audit.
 *
 * Body: { action: ZohoPendingAction }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const scope = getViewerScope(session);
  const sUser = session.user as unknown as Record<string, string | null | undefined>;
  const asesorName = (sUser.displayName || session.user.name || scope.email.split('@')[0]) as string;

  let body: { action?: ZohoPendingAction };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const action = body.action;
  if (!action || !action.type || !action.leadId) {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  }

  // ── Re-validación de dueño (defensa real, no confiamos en el cliente) ──
  const lead = await getLeadBasic(action.leadId);
  if (!lead) {
    return NextResponse.json({ error: `No se encontró el lead ${action.leadId} en Zoho.` }, { status: 404 });
  }
  if (!ownsLead({ ownerEmail: lead.ownerEmail }, scope)) {
    return NextResponse.json({ error: NOT_IN_PORTFOLIO_MSG }, { status: 403 });
  }

  try {
    // Flujo compuesto: varios pasos sobre el mismo lead, ejecutados en orden.
    const steps = action.type === 'compound' ? (action.steps || []) : [action];
    if (steps.length === 0) return NextResponse.json({ error: 'Acción vacía' }, { status: 400 });

    const messages: string[] = [];
    for (const step of steps) {
      messages.push(await executeStep(step, lead.fullName, lead.status, scope.email, asesorName));
    }
    return NextResponse.json({ ok: true, message: messages.join(' · ') });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error ejecutando la acción';
    console.error('[zoho/action]', action.type, msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

/** Ejecuta un paso individual (nota/estado/seguimiento). Lanza Error si falla. */
async function executeStep(
  step: ZohoPendingAction,
  fullName: string,
  prevStatus: string | null,
  actorEmail: string,
  asesorName: string
): Promise<string> {
  switch (step.type) {
    case 'nota': {
      const contenido = (step.nota?.contenido || '').trim();
      if (contenido.length < 2) throw new Error('La nota está vacía');
      if (contenido.length > 5000) throw new Error('Nota demasiado larga (máx 5000)');
      const ok = await addLeadNote(step.leadId, `${contenido}\n— Gestión: ${asesorName}`, `Nota de ${asesorName}`);
      if (!ok) throw new Error('Zoho no aceptó la nota');
      await logAudit(actorEmail, 'zoho.note', step.leadId, { via: 'chat', chars: contenido.length });
      return `Nota guardada en ${fullName}`;
    }
    case 'estado': {
      const nuevoEstado = (step.estado?.nuevoEstado || '').trim();
      if (!VALID_LEAD_STATUSES.includes(nuevoEstado)) throw new Error(`Estado no válido: "${nuevoEstado}"`);
      const ok = await updateLeadStatus(step.leadId, nuevoEstado);
      if (!ok) throw new Error('Zoho no aceptó el cambio de estado');
      await logAudit(actorEmail, 'zoho.status', step.leadId, { from: prevStatus, to: nuevoEstado });
      return `estado → ${nuevoEstado}`;
    }
    case 'seguimiento': {
      const callDate = step.seguimiento?.callDate || null;
      const appointmentAt = step.seguimiento?.appointmentAt || null;
      const nota = (step.seguimiento?.nota || '').trim();
      if (!callDate && !appointmentAt) throw new Error('Falta la fecha de seguimiento');
      if (callDate && !/^\d{4}-\d{2}-\d{2}$/.test(callDate)) throw new Error('Formato de fecha inválido (YYYY-MM-DD)');
      const ok = await setLeadFollowup(step.leadId, { callDate, appointmentAt });
      if (!ok) throw new Error('Zoho no aceptó el seguimiento');
      if (nota.length >= 2) {
        await addLeadNote(step.leadId, `📅 Seguimiento: ${nota}\n— Gestión: ${asesorName}`, `Seguimiento de ${asesorName}`);
      }
      await logAudit(actorEmail, 'zoho.followup', step.leadId, { callDate, appointmentAt });
      return 'seguimiento programado';
    }
    default:
      throw new Error('Tipo de acción no soportado');
  }
}
