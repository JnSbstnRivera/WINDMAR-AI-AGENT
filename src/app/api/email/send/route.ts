import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { findTemplate, renderTemplate } from '@/lib/email-templates';

/**
 * POST /api/email/send
 * Envía un correo de seguimiento desde el Outlook del asesor logueado.
 * Usa Microsoft Graph (sendMail) con el access_token guardado en el JWT.
 *
 * Body: {
 *   to:         string,                 // correo del cliente
 *   name:       string,                 // nombre del cliente
 *   templateId: string,                 // id de la plantilla
 *   extras?:    Record<string, string>  // campos extra (documents, date, time, etc.)
 * }
 *
 * El correo queda automáticamente en la carpeta /Enviados del asesor.
 * La firma usa el NOMBRE FORMAL del asesor (Juan Rivera) extraído del SSO,
 * no el display_name personalizado (que puede ser un apodo).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

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

  let body: {
    to?: string;
    name?: string;
    templateId?: string;
    extras?: Record<string, string>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const to = (body.to || '').trim();
  const name = (body.name || '').trim();
  const templateId = (body.templateId || 'general').trim();
  const extras = body.extras || {};

  // Validación mínima
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'Correo del cliente inválido' }, { status: 400 });
  }
  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Falta el nombre del cliente' }, { status: 400 });
  }

  // Validar plantilla
  const template = findTemplate(templateId);
  if (!template) {
    return NextResponse.json({ error: `Plantilla "${templateId}" no existe` }, { status: 400 });
  }

  // Validar campos extra requeridos
  if (template.extraFields) {
    for (const field of template.extraFields) {
      if (field.required && !(extras[field.key] || '').trim()) {
        return NextResponse.json(
          { error: `Falta el campo "${field.label}"` },
          { status: 400 }
        );
      }
    }
  }

  // Datos del asesor para la firma — formal_name del SSO de Microsoft
  const userExt = session.user as unknown as {
    formalName?: string | null;
    displayName?: string | null;
  };
  const asesorName =
    userExt.formalName ||
    userExt.displayName ||
    session.user.name ||
    session.user.email.split('@')[0];
  const asesorEmail = session.user.email;

  // Renderizar plantilla
  const { subject, html: htmlBody } = renderTemplate(template, {
    name,
    asesorName,
    asesorEmail,
    extras,
  });

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

      if (graphRes.status === 401) {
        return NextResponse.json(
          { error: 'Tu sesión expiró. Cierra sesión y vuelve a iniciar.', needsRelogin: true },
          { status: 401 }
        );
      }
      if (graphRes.status === 403) {
        return NextResponse.json(
          { error: 'No tienes permiso de enviar correos. Pide a IT que apruebe Mail.Send.' },
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
