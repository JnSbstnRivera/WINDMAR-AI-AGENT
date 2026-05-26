import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * POST /api/email/send
 * Envía un correo de seguimiento desde el Outlook del asesor logueado.
 * Usa Microsoft Graph (sendMail) con el access_token guardado en el JWT.
 *
 * Body: { to: string, name: string }
 * - to:   correo del cliente
 * - name: nombre del cliente para personalizar el saludo
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

  let body: { to?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const to = (body.to || '').trim();
  const name = (body.name || '').trim();

  // Validación mínima — Graph también valida pero damos errores legibles
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'Correo del cliente inválido' }, { status: 400 });
  }
  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Falta el nombre del cliente' }, { status: 400 });
  }

  // Nombre del asesor para la firma (cae al email si no hay displayName)
  const asesorName =
    ((session.user as unknown as { displayName?: string | null }).displayName) ||
    session.user.name ||
    session.user.email.split('@')[0];

  const subject = `Seguimiento — Windmar Home`;

  // Plantilla simple en HTML — sin precios (regla suprema), tono cálido.
  // Saludo personalizado, CTA abierta para que el cliente responda.
  const htmlBody = `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1B3A5C; line-height: 1.6;">
      <p>Hola <strong>${escapeHtml(name)}</strong>,</p>

      <p>¿Cómo estás? Te escribo de <strong>Windmar Home</strong> para saber si todavía sigues interesado en lo que conversamos.</p>

      <p>Si quieres, dime cuándo te queda bien y conversamos para aclarar cualquier duda que tengas.</p>

      <p>¡Quedo pendiente!</p>

      <p style="margin-top: 24px;">
        Saludos,<br>
        <strong>${escapeHtml(asesorName)}</strong><br>
        <span style="color: #6b7280; font-size: 12px;">Windmar Home Puerto Rico · 22 años iluminando hogares 🇵🇷</span>
      </p>
    </div>
  `.trim();

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
    });
  } catch (err) {
    console.error('[email/send] Error de red:', err);
    return NextResponse.json({ error: 'Error de conexión con Microsoft' }, { status: 500 });
  }
}

/** Escapa HTML para evitar inyección en el correo (nombre del cliente viene del asesor). */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
