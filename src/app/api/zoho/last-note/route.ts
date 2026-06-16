import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getLeadBasic, getLeadLastNote } from '@/lib/zoho';
import { getViewerScope, ownsLead, NOT_IN_PORTFOLIO_MSG } from '@/lib/zoho-access';

export const runtime = 'nodejs';
export const maxDuration = 15;

/**
 * GET /api/zoho/last-note?leadId=...  — última nota de un lead (para el pop-up
 * al pasar el mouse, estilo Zoho). Carga bajo demanda: NO lentifica las listas.
 * Scoped: el asesor solo ve notas de SUS leads.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const scope = getViewerScope(session);

  const leadId = new URL(req.url).searchParams.get('leadId')?.trim();
  if (!leadId) return NextResponse.json({ error: 'Falta leadId' }, { status: 400 });

  try {
    const lead = await getLeadBasic(leadId);
    if (!lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
    if (!ownsLead({ ownerEmail: lead.ownerEmail }, scope)) {
      return NextResponse.json({ error: NOT_IN_PORTFOLIO_MSG }, { status: 403 });
    }
    const note = await getLeadLastNote(lead.id);
    return NextResponse.json({ note: note ? { content: note.content, createdAt: note.createdAt } : null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error consultando la nota';
    console.error('[zoho/last-note]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
