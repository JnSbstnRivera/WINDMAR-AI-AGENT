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
    switch (action.type) {
      case 'nota': {
        const contenido = (action.nota?.contenido || '').trim();
        if (contenido.length < 2) return NextResponse.json({ error: 'La nota está vacía' }, { status: 400 });
        if (contenido.length > 5000) return NextResponse.json({ error: 'Nota demasiado larga (máx 5000)' }, { status: 400 });
        // Atribución del asesor en el cuerpo (la firma SUN BOT la agrega addLeadNote).
        const conAtribucion = `${contenido}\n— Gestión: ${asesorName}`;
        const ok = await addLeadNote(action.leadId, conAtribucion, `Nota de ${asesorName}`);
        if (!ok) return NextResponse.json({ error: 'Zoho no aceptó la nota' }, { status: 502 });
        await logAudit(scope.email, 'zoho.note', action.leadId, { via: 'chat', chars: contenido.length });
        return NextResponse.json({ ok: true, message: `Nota guardada en ${lead.fullName}.` });
      }

      case 'estado': {
        const nuevoEstado = (action.estado?.nuevoEstado || '').trim();
        if (!VALID_LEAD_STATUSES.includes(nuevoEstado)) {
          return NextResponse.json({ error: `Estado no válido: "${nuevoEstado}"` }, { status: 400 });
        }
        const ok = await updateLeadStatus(action.leadId, nuevoEstado);
        if (!ok) return NextResponse.json({ error: 'Zoho no aceptó el cambio de estado' }, { status: 502 });
        await logAudit(scope.email, 'zoho.status', action.leadId, { from: lead.status, to: nuevoEstado });
        return NextResponse.json({ ok: true, message: `${lead.fullName}: estado → ${nuevoEstado}.` });
      }

      case 'seguimiento': {
        const callDate = action.seguimiento?.callDate || null;
        const appointmentAt = action.seguimiento?.appointmentAt || null;
        const nota = (action.seguimiento?.nota || '').trim();
        if (!callDate && !appointmentAt) {
          return NextResponse.json({ error: 'Falta la fecha de seguimiento' }, { status: 400 });
        }
        if (callDate && !/^\d{4}-\d{2}-\d{2}$/.test(callDate)) {
          return NextResponse.json({ error: 'Formato de fecha inválido (YYYY-MM-DD)' }, { status: 400 });
        }
        const ok = await setLeadFollowup(action.leadId, { callDate, appointmentAt });
        if (!ok) return NextResponse.json({ error: 'Zoho no aceptó el seguimiento' }, { status: 502 });
        // Nota opcional que documenta el seguimiento en el historial.
        if (nota.length >= 2) {
          await addLeadNote(action.leadId, `📅 Seguimiento: ${nota}\n— Gestión: ${asesorName}`, `Seguimiento de ${asesorName}`);
        }
        await logAudit(scope.email, 'zoho.followup', action.leadId, { callDate, appointmentAt });
        return NextResponse.json({ ok: true, message: `Seguimiento programado para ${lead.fullName}.` });
      }

      default:
        return NextResponse.json({ error: 'Tipo de acción no soportado' }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error ejecutando la acción';
    console.error('[zoho/action]', action.type, msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
