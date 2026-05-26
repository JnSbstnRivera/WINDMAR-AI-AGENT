import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { findTemplate, renderTemplate, renderCustomEmail } from '@/lib/email-templates';

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
    /** Extensión del asesor — opcional, se agrega a la firma */
    asesorExt?: string;
    /** Cuerpo personalizado (texto plano) — si viene, sustituye la plantilla */
    customBody?: string;
    /** Asunto personalizado — solo aplica si hay customBody */
    customSubject?: string;
    /** Archivos adjuntos — base64 con metadata */
    attachments?: Array<{
      name: string;
      contentType: string;
      contentBytes: string; // base64
    }>;
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
  const asesorExt = (body.asesorExt || '').trim();
  const attachments = body.attachments || [];
  const customBody = (body.customBody || '').trim();
  const customSubject = (body.customSubject || '').trim();
  const isCustom = customBody.length > 0;

  // Validar attachments: Graph permite hasta ~3MB inline (4MB con overhead base64).
  // Más allá requiere upload session que no implementamos en MVP.
  const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024; // 3MB por archivo
  const MAX_TOTAL_BYTES = 4 * 1024 * 1024; // 4MB total
  let totalBytes = 0;
  for (const att of attachments) {
    if (!att.name || !att.contentType || !att.contentBytes) {
      return NextResponse.json({ error: 'Archivo adjunto malformado' }, { status: 400 });
    }
    // base64 → bytes reales: longitud * 3/4 aprox
    const bytes = Math.floor((att.contentBytes.length * 3) / 4);
    if (bytes > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json(
        { error: `El archivo "${att.name}" excede 3MB. Comprímelo o súbelo a Drive.` },
        { status: 400 }
      );
    }
    totalBytes += bytes;
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.json(
      { error: 'Los archivos suman más de 4MB. Quita alguno o reduce tamaño.' },
      { status: 400 }
    );
  }

  // Validación mínima
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'Correo del cliente inválido' }, { status: 400 });
  }
  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Falta el nombre del cliente' }, { status: 400 });
  }

  // Validar plantilla (sirve para el label de tracking aunque sea custom)
  const template = findTemplate(templateId);
  if (!template) {
    return NextResponse.json({ error: `Plantilla "${templateId}" no existe` }, { status: 400 });
  }

  // Validar campos extra requeridos SOLO si NO es cuerpo personalizado.
  // Cuando el asesor editó el texto, los campos ya están "horneados" en el body.
  if (!isCustom && template.extraFields) {
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

  // Renderizar: cuerpo personalizado del asesor O plantilla normal.
  // En ambos casos la firma corporativa se agrega automáticamente.
  const { subject, html: htmlBody } = isCustom
    ? renderCustomEmail({
        subject: customSubject || template.subject,
        bodyText: customBody,
        asesorName,
        asesorEmail,
        asesorExt: asesorExt || undefined,
      })
    : renderTemplate(template, {
        name,
        asesorName,
        asesorEmail,
        asesorExt: asesorExt || undefined,
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
          // Attachments inline (base64) — formato fileAttachment de Graph
          attachments: attachments.map((att) => ({
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: att.name,
            contentType: att.contentType,
            contentBytes: att.contentBytes,
          })),
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
