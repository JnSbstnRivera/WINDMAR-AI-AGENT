import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  getZohoUserIdByEmail,
  getMyLeads,
  getLeadLastNote,
  type MyLead,
} from '@/lib/zoho';
import { isActionable, type Bucket } from '@/lib/zoho-status';
import { getViewerScope } from '@/lib/zoho-access';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Triage: cuántos leads accionables revisamos por notas (cota dura para no
// quemar la API ni exceder el tiempo). Se informa en la respuesta lo revisado.
const TRIAGE_NOTE_LIMIT = 40;
const STALE_HOURS = 24;

/**
 * GET /api/zoho/my-leads
 *   ?triage=1   → además revisa la última nota de los leads accionables y marca
 *                 los que no tienen nota en las últimas 24h (necesitan seguimiento).
 *   ?owner=email → solo para Líder/Admin: ver la cartera de otro asesor.
 *
 * Asesor: siempre su propia cartera (scoping por dueño).
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const scope = getViewerScope(session);
  const url = new URL(req.url);
  const triage = url.searchParams.get('triage') === '1';
  const ownerParam = (url.searchParams.get('owner') || '').trim().toLowerCase();

  // Asesor solo ve lo suyo. Elevados pueden pedir ?owner=correo.
  const targetEmail = ownerParam && scope.canSeeAll ? ownerParam : scope.email;

  try {
    const ownerId = await getZohoUserIdByEmail(targetEmail);
    if (!ownerId) {
      return NextResponse.json(
        { error: `No se encontró el usuario de Zoho para ${targetEmail}. Avisa a un admin para mapearlo.` },
        { status: 404 }
      );
    }

    const leads = await getMyLeads(ownerId);

    // Conteo por bucket
    const byBucket: Record<string, number> = {};
    for (const l of leads) byBucket[l.bucket] = (byBucket[l.bucket] || 0) + 1;

    const base = {
      ownerEmail: targetEmail,
      total: leads.length,
      byBucket,
      leads,
    };

    if (!triage) {
      return NextResponse.json(base);
    }

    // ── Triage: revisar última nota de los leads accionables ──
    const actionable = leads.filter((l) => isActionable(l.bucket));
    const toCheck = actionable.slice(0, TRIAGE_NOTE_LIMIT);
    const cutoff = Date.now() - STALE_HOURS * 3600 * 1000;

    // Concurrencia acotada (chunks de 8) para no saturar Zoho.
    const checked: MyLead[] = [];
    for (let i = 0; i < toCheck.length; i += 8) {
      const chunk = toCheck.slice(i, i + 8);
      const notes = await Promise.all(chunk.map((l) => getLeadLastNote(l.id)));
      chunk.forEach((l, idx) => {
        const note = notes[idx];
        const noteTime = note?.createdAt ? Date.parse(note.createdAt) : 0;
        const stale = !note || isNaN(noteTime) || noteTime < cutoff;
        checked.push({ ...l, lastNote: note, needsFollowUp: stale });
      });
    }

    const needFollowUp = checked.filter((l) => l.needsFollowUp);

    return NextResponse.json({
      ...base,
      triage: {
        actionableTotal: actionable.length,
        checked: toCheck.length,
        capped: actionable.length > TRIAGE_NOTE_LIMIT,
        staleHours: STALE_HOURS,
        needFollowUp,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error consultando Zoho';
    console.error('[zoho/my-leads]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export type MyLeadsResponse = {
  ownerEmail: string;
  total: number;
  byBucket: Record<Bucket, number>;
  leads: MyLead[];
  triage?: {
    actionableTotal: number;
    checked: number;
    capped: boolean;
    staleHours: number;
    needFollowUp: MyLead[];
  };
};
