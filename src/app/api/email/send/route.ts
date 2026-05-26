import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { findTemplate, renderTemplate } from '@/lib/email-templates';

/**
 * POST /api/email/send
 * Envía un correo de seguimiento desde el Outlook del asesor logueado.
 * Usa Microsoft Graph (sendMail) con el access_token guardado en el JWT.
 *
 * Body: { to: string, name: string, templateId: string }
 * - to:         correo del cliente
 * - name:       nombre del cliente para personalizar el saludo
 * - templateId: id de la plantilla en src/lib/email-templates.ts
 *
 * El correo queda automáticamente en la carpeta /Enviados del asesor.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // session.msAccessToken viene del JWT (callback en auth.ts).
  // Si es null, el asesor entró ANTES del cambio de scope → debe hacer logout/login.
  const accessToken = (session as unknown as { msAccessToken?: string | null }).msAccessToken;
  if (!accessToken) {
    return NextResponse.json(
      {
        error: 'Falta permiso de correo. Cierra sesión y vuelve a iniciar para aprobar el nuevo permiso.',
        needsRelogin: true,
      },
      { status: 403 }
    );
  }

  let body: { to?: string; name?: string; templateId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const to = (body.to || '').trim();
  const name = (body.name || '').trim();
  const templateId = (body.templateId || 'general').trim();

  // Validación mínima — Graph también valida pero damos errores legibles
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'Correo del cliente inválido' }, { status: 400 });
  }
  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Falta el nombre del cliente' }, { status: 400 });
  }

  // Validar que la plantilla existe — protege contra IDs inventados desde el cliente
  const template = findTemplate(templateId);
  if (!template) {
    return NextResponse.json({ error: `Plantilla "${templateId}" no existe` }, { status: 400 });
  }

  // Nombre del asesor para la firma (cae al email si no hay displayName)
  const asesorName =
    ((session.user as unknown as { displayName?: string | null }).displayName) ||
    session.user.name ||
    session.user.email.split('@')[0];

  // Renderizar la plantilla — escape HTML interno, sin precios (regla suprema)
  const { subject, html: htmlBody } = renderTemplate(template, { name, asesor: asesorName });

  // Llamada a Graph API — sendMail envía y guarda en Enviados automáticamente
  try {
    const graphRes = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'HTML', content: htmlBody },
          toRecipients: [{ emailAddress: { address: to, name } }],
        },
        saveToSentItems: true,
      }),
    });

    if (!graphRes.ok) {
      const errText = await graphRes.text().catch(() => '');
      console.error('[email/send] Graph rechazó:', graphRes.status, errText);

      // 401 = token expirado o inválido → asesor debe re-login
      if (graphRes.status === 401) {
        return NextResponse.json(
          {
            error: 'Tu sesión expiró. Cierra sesión y vuelve a iniciar.',
            needsRelogin: true,
          },
          { status: 401 }
        );
      }
      // 403 = scope insuficiente (raro, pero por si acaso)
      if (graphRes.status === 403) {
        return NextResponse.json(
          {
            error: 'No tienes permiso de enviar correos. Pide a IT que apruebe Mail.Send.',
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: `Microsoft rechazó el envío (${graphRes.status})` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Correo enviado a ${name} (${to})`,
      template: template.label,
    });
  } catch (err) {
    console.error('[email/send] Error de red:', err);
    return NextResponse.json({ error: 'Error de conexión con Microsoft' }, { status: 500 });
  }
}
