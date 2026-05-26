// ════════════════════════════════════════
// EMAIL TEMPLATES — correos de seguimiento
// ════════════════════════════════════════
// Plantillas reutilizables que el asesor elige en el modal /seguimiento.
// Todas respetan la REGLA SUPREMA: cero precios concretos, cero ahorros estimados.
// El CTA siempre dirige a conversación / portal / cotizador oficial.
//
// Placeholders soportados:
//   {{name}}     → nombre del cliente
//   {{asesor}}   → nombre del asesor (de display_name o email)
//
// renderTemplate() los reemplaza con escape HTML — los inputs vienen del asesor
// pero podrían contener caracteres especiales (apóstrofes, &, etc.).

export interface EmailTemplate {
  /** Identificador estable que viaja al backend */
  id: string;
  /** Label corto que aparece en el selector del modal */
  label: string;
  /** Emoji que ayuda a reconocer la plantilla de un vistazo */
  icon: string;
  /** Descripción breve — cuándo usarla */
  description: string;
  /** Asunto del correo (sin placeholders) */
  subject: string;
  /** Body HTML con {{name}} y {{asesor}} */
  htmlBody: string;
}

// Footer común con branding Windmar — se aplica a todas las plantillas
const FOOTER = `
  <p style="margin-top: 24px;">
    Saludos,<br>
    <strong>{{asesor}}</strong><br>
    <span style="color: #6b7280; font-size: 12px;">Windmar Home Puerto Rico · 22 años iluminando hogares 🇵🇷</span>
  </p>
`.trim();

// Wrap común — envuelve el cuerpo en un div con estilos consistentes
function wrap(innerHtml: string): string {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1B3A5C; line-height: 1.6;">
      ${innerHtml}
      ${FOOTER}
    </div>
  `.trim();
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  // ─── 1. Seguimiento general ───────────────────────────────────────
  {
    id: 'general',
    label: 'Seguimiento general',
    icon: '👋',
    description: 'Cliente con quien ya hablaste — ¿sigues interesado?',
    subject: 'Seguimiento — Windmar Home',
    htmlBody: wrap(`
      <p>Hola <strong>{{name}}</strong>,</p>
      <p>¿Cómo estás? Te escribo de <strong>Windmar Home</strong> para saber si todavía sigues interesado en lo que conversamos.</p>
      <p>Si quieres, dime cuándo te queda bien y conversamos para aclarar cualquier duda que tengas.</p>
      <p>¡Quedo pendiente!</p>
    `),
  },

  // ─── 2. Pedir factura LUMA ────────────────────────────────────────
  {
    id: 'luma_bill',
    label: 'Pedir factura LUMA',
    icon: '⚡',
    description: 'Necesitas la factura del cliente para una propuesta personalizada',
    subject: 'Envíame tu factura LUMA — Windmar Home',
    htmlBody: wrap(`
      <p>Hola <strong>{{name}}</strong>,</p>
      <p>Para armarte una propuesta hecha a la medida de tu hogar, necesito ver una factura reciente de <strong>LUMA</strong> — así sabemos exactamente cuánta energía consumes y podemos diseñar el sistema que mejor se ajuste a ti.</p>
      <p>Respóndeme a este correo con una <strong>foto o PDF de tu última factura</strong> y yo me encargo del resto.</p>
      <p>¡Quedo pendiente!</p>
    `),
  },

  // ─── 3. No contestó llamada ───────────────────────────────────────
  {
    id: 'missed_call',
    label: 'No contestó la llamada',
    icon: '📞',
    description: 'Intentaste llamar y no contestó — abres puerta para que él decida horario',
    subject: 'Intenté comunicarme contigo — Windmar Home',
    htmlBody: wrap(`
      <p>Hola <strong>{{name}}</strong>,</p>
      <p>Te escribo porque <strong>traté de comunicarme contigo</strong> por teléfono y no pude alcanzarte. Sé que el tiempo es valioso, así que dime tú cuándo te queda mejor para conversar.</p>
      <p>Puedes responderme aquí con un horario que te funcione, o llamarme de regreso cuando puedas.</p>
    `),
  },

  // ─── 4. Cita técnica ──────────────────────────────────────────────
  {
    id: 'appointment',
    label: 'Confirmar cita técnica',
    icon: '📅',
    description: 'Recordar o confirmar visita técnica programada',
    subject: 'Tu visita técnica — Windmar Home',
    htmlBody: wrap(`
      <p>Hola <strong>{{name}}</strong>,</p>
      <p>Te escribo para confirmar tu <strong>visita técnica</strong> con nuestro equipo de Windmar Home. El técnico revisará tu hogar para preparar la propuesta más precisa posible.</p>
      <p>Si por algún motivo necesitas <strong>reagendar</strong>, avísame con tiempo y lo coordinamos sin problema.</p>
      <p>¡Nos vemos pronto!</p>
    `),
  },

  // ─── 5. Más información ───────────────────────────────────────────
  {
    id: 'more_info',
    label: 'Más información',
    icon: '📚',
    description: 'Cliente pidió tiempo para revisar — le mandas recursos sin presionar',
    subject: 'Información que te prometí — Windmar Home',
    htmlBody: wrap(`
      <p>Hola <strong>{{name}}</strong>,</p>
      <p>Como te comenté en nuestra conversación, te dejo la información para que la revises con calma. Tómate el tiempo que necesites y luego me dices qué dudas te quedan.</p>
      <p>Puedes ver nuestros productos y herramientas en el portal oficial: <a href="https://windmarhome.com" style="color: #F7941D; font-weight: 600;">windmarhome.com</a></p>
      <p>¡Quedo pendiente de tus comentarios!</p>
    `),
  },
];

/**
 * Busca una plantilla por id. Retorna null si no existe.
 * El backend valida que el id es legítimo antes de enviar.
 */
export function findTemplate(id: string): EmailTemplate | null {
  return EMAIL_TEMPLATES.find((t) => t.id === id) || null;
}

/**
 * Reemplaza {{name}} y {{asesor}} en el HTML — escapando para evitar
 * inyección de scripts si el asesor pega contenido raro en los inputs.
 */
export function renderTemplate(
  template: EmailTemplate,
  vars: { name: string; asesor: string }
): { subject: string; html: string } {
  const safeName = escapeHtml(vars.name);
  const safeAsesor = escapeHtml(vars.asesor);
  const html = template.htmlBody
    .replace(/\{\{name\}\}/g, safeName)
    .replace(/\{\{asesor\}\}/g, safeAsesor);
  return { subject: template.subject, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
