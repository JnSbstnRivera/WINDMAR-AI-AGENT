import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { assignLeads, getZohoUserIdByEmail } from '@/lib/zoho';
import { getViewerScope, canWrite } from '@/lib/zoho-access';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/zoho/assign
 * Asigna/reasigna leads a un asesor (asignación masiva).
 * Body: { leadIds: string[], ownerEmail: string }
 * Solo Líder/Admin (canWrite). El Asesor es solo-lectura.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const scope = getViewerScope(session);
  if (!canWrite(scope)) {
    return NextResponse.json(
      { error: 'No tienes permiso para asignar leads. Esta acción es para líderes/admins.' },
      { status: 403 }
    );
  }

  let body: {
    leadIds?: string[];
    ownerEmail?: string;
    fromOwner?: string;                                 // owner anterior (para auditar "de quién → a quién")
    leads?: Array<{ id?: string; num?: string | null; name?: string | null }>; // datos del lead para mapear
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const leadIds = (body.leadIds || []).filter((x) => typeof x === 'string' && x.trim());
  const ownerEmail = (body.ownerEmail || '').trim().toLowerCase();

  if (leadIds.length === 0) return NextResponse.json({ error: 'Sin leads para asignar' }, { status: 400 });
  if (leadIds.length > 500) {
    return NextResponse.json({ error: 'Máximo 500 leads por asignación' }, { status: 400 });
  }
  if (!ownerEmail) return NextResponse.json({ error: 'Falta el correo del asesor destino' }, { status: 400 });

  try {
    const ownerId = await getZohoUserIdByEmail(ownerEmail);
    if (!ownerId) {
      return NextResponse.json(
        { error: `No se encontró el usuario de Zoho para ${ownerEmail}.` },
        { status: 404 }
      );
    }

    const result = await assignLeads(leadIds, ownerId);
    await logAudit(scope.email, 'zoho.assign', ownerEmail, {
      count: leadIds.length,
      success: result.success,
      failed: result.failed,
      fromOwner: (body.fromOwner || '').trim().toLowerCase() || null, // de quién era
      leads: Array.isArray(body.leads)                                 // qué leads (cap 200)
        ? body.leads.slice(0, 200).map((l) => ({ num: l.num ?? null, name: l.name ?? null }))
        : undefined,
    });

    return NextResponse.json({ ok: true, ownerEmail, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error asignando leads';
    console.error('[zoho/assign]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
