// ════════════════════════════════════════
// NOTIFICACIÓN DE ACCESO — correo a los admins (Microsoft Graph)
// ════════════════════════════════════════
// Cuando un usuario NUEVO inicia sesión por primera vez, queda en estado
// 'pending'. Esta función avisa a los admins por correo para que lo aprueben.
//
// Se envía DESDE la cuenta del propio usuario nuevo (su access_token de Graph
// con scope Mail.Send, igual que el correo de seguimiento), así no requiere
// permisos a nivel de aplicación. El "from" será el solicitante — natural para
// un "fulano solicita acceso".

import { getAdminEmailList } from '@/lib/admin-auth';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://windmar-ai-agent.vercel.app';

interface NotifyArgs {
  accessToken: string;
  newUserEmail: string;
  displayName?: string | null;
  departamento?: string | null;
}

/**
 * Avisa a los admins que hay un acceso pendiente de aprobar.
 * Best-effort: si Graph falla, NO rompe el login (se loguea y sigue).
 */
export async function notifyAdminsNewAccess({
  accessToken,
  newUserEmail,
  displayName,
  departamento,
}: NotifyArgs): Promise<void> {
  const admins = getAdminEmailList();
  if (admins.length === 0) return;

  const nombre = displayName?.trim() || newUserEmail.split('@')[0];
  const depto = departamento?.trim() || 'sin especificar';
  const adminUrl = `${APP_URL}/admin/usuarios`;

  const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1B3A5C;">
    <div style="border-bottom:3px solid #F7941D;padding-bottom:12px;margin-bottom:16px;">
      <h2 style="margin:0;font-size:18px;color:#1B3A5C;">Nuevo acceso a Sun Bot</h2>
      <p style="margin:4px 0 0;font-size:13px;color:#5b6b7c;">Agente Windmar Home AI · solicitud pendiente</p>
    </div>
    <p style="font-size:15px;">Un usuario nuevo inició sesión y está <strong style="color:#b8860b;">esperando aprobación</strong>:</p>
    <table style="width:100%;font-size:14px;border-collapse:collapse;margin:14px 0;">
      <tr><td style="padding:6px 0;color:#5b6b7c;width:130px;">Nombre</td><td style="padding:6px 0;font-weight:600;">${nombre}</td></tr>
      <tr><td style="padding:6px 0;color:#5b6b7c;">Correo</td><td style="padding:6px 0;">${newUserEmail}</td></tr>
      <tr><td style="padding:6px 0;color:#5b6b7c;">Departamento</td><td style="padding:6px 0;">${depto}</td></tr>
    </table>
    <a href="${adminUrl}" style="display:inline-block;background:#1B3A5C;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;">Revisar y aprobar →</a>
    <p style="font-size:12px;color:#8a98a6;margin-top:18px;">Puedes aprobarlo como Asesor (solo lectura) o Líder, o rechazarlo, desde el panel de administración.</p>
  </div>`;

  try {
    const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject: `Nuevo acceso a Sun Bot — ${nombre}`,
          body: { contentType: 'HTML', content: html },
          toRecipients: admins.map((email) => ({ emailAddress: { address: email } })),
        },
        saveToSentItems: false,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.error('[access-notify] Graph rechazó el aviso:', res.status, t.slice(0, 200));
    }
  } catch (err) {
    console.error('[access-notify] Error enviando aviso de acceso:', err);
  }
}
