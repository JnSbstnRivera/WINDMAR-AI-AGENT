import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { addLeadNote } from '@/lib/zoho';
import { getViewerScope, canWrite } from '@/lib/zoho-access';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const maxDuration = 15;

/**
 * POST /api/zoho/note
 * Agrega una nota a un lead.
 * Body: { leadId: string, content: string }
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
      { error: 'No tienes permiso para escribir notas. Esta acción es para líderes/admins.' },
      { status: 403 }
    );
  }

  let body: { leadId?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const leadId = (body.leadId || '').trim();
  const content = (body.content || '').trim();
  if (!leadId) return NextResponse.json({ error: 'Falta leadId' }, { status: 400 });
  if (content.length < 2) return NextResponse.json({ error: 'La nota está vacía' }, { status: 400 });
  if (content.length > 5000) return NextResponse.json({ error: 'Nota demasiado larga (máx 5000)' }, { status: 400 });

  try {
    const ok = await addLeadNote(leadId, content, `Nota de ${scope.email}`);
    if (!ok) return NextResponse.json({ error: 'Zoho no aceptó la nota' }, { status: 502 });
    await logAudit(scope.email, 'zoho.note', leadId, { chars: content.length });
    return NextResponse.json({ ok: true, leadId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error guardando la nota';
    console.error('[zoho/note]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
