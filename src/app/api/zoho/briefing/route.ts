import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getMyLeads, getZohoUserIdByEmail, resolveAsesor } from '@/lib/zoho';
import { getViewerScope } from '@/lib/zoho-access';
import { isActionable, BUCKET_LABEL, type Bucket } from '@/lib/zoho-status';

export const runtime = 'nodejs';
export const maxDuration = 20;

interface LeadBrief {
  id: string;
  leadNumber: string | null;
  fullName: string;
  status: string | null;
  bucket: Bucket;
  phone: string | null;
  zohoUrl: string;
  when: string | null; // hora de cita o fecha de seguimiento, legible
}

/** Fecha de hoy en PR como YYYY-MM-DD. */
function todayPR(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Puerto_Rico', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

/**
 * GET /api/zoho/briefing — resumen proactivo de la cartera del usuario logueado:
 * citas de HOY, seguimientos para hoy o vencidos, y conteo de accionables.
 * Rápido: NO consulta notas (usa los campos nativos de cita/seguimiento).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const scope = getViewerScope(session);
  const sUser = session.user as unknown as Record<string, string | null | undefined>;
  const name = (sUser.displayName || session.user.name || scope.email.split('@')[0] || '').toString().split(' ')[0];

  try {
    const self = await resolveAsesor(scope.email);
    const ownerId = self.kind === 'one' ? self.user.id : await getZohoUserIdByEmail(scope.email);
    if (!ownerId) return NextResponse.json({ empty: true, reason: 'sin_usuario_zoho' });

    const leads = await getMyLeads(ownerId);
    if (leads.length === 0) return NextResponse.json({ empty: true, reason: 'sin_leads' });

    const hoy = todayPR();

    const byBucket: Record<string, number> = {};
    for (const l of leads) byBucket[l.bucket] = (byBucket[l.bucket] || 0) + 1;
    const accionables = leads.filter((l) => isActionable(l.bucket)).length;

    const fmtHora = (iso: string) => {
      try {
        return new Intl.DateTimeFormat('es-PR', { timeZone: 'America/Puerto_Rico', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso));
      } catch { return ''; }
    };

    const toBrief = (l: typeof leads[number], when: string | null): LeadBrief => ({
      id: l.id, leadNumber: l.leadNumber, fullName: l.fullName, status: l.status,
      bucket: l.bucket, phone: l.phone, zohoUrl: l.zohoUrl, when,
    });

    // Citas de HOY (Presenter_Appointment cae hoy en PR)
    const citasHoy = leads
      .filter((l) => (l.appointmentAt || '').slice(0, 10) === hoy)
      .sort((a, b) => (a.appointmentAt || '').localeCompare(b.appointmentAt || ''))
      .map((l) => toBrief(l, l.appointmentAt ? fmtHora(l.appointmentAt) : null));

    // Seguimientos para hoy o vencidos (Llamar_de_esta_fecha <= hoy)
    const seguimientos = leads
      .filter((l) => l.callDate && l.callDate.slice(0, 10) <= hoy)
      .sort((a, b) => (a.callDate || '').localeCompare(b.callDate || ''))
      .map((l) => toBrief(l, l.callDate));

    const resumen = Object.entries(byBucket)
      .map(([b, n]) => `${BUCKET_LABEL[b as Bucket] || b}: ${n}`)
      .join(' · ');

    return NextResponse.json({
      empty: false,
      name,
      total: leads.length,
      accionables,
      resumen,
      citasHoy: citasHoy.slice(0, 8),
      citasHoyTotal: citasHoy.length,
      seguimientos: seguimientos.slice(0, 8),
      seguimientosTotal: seguimientos.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error generando el briefing';
    console.error('[zoho/briefing]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
