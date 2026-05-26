// ════════════════════════════════════════
// EMAIL TEMPLATES — correos de seguimiento
// ════════════════════════════════════════
// Sistema de plantillas con CAMPOS EXTRA dinámicos por plantilla.
// Algunas plantillas tienen campos adicionales que el asesor llena
// (ej. fecha+hora en cita, documentos a pedir, producto+consultor en bienvenida).
//
// Todas respetan la REGLA SUPREMA: cero precios concretos, cero ahorros estimados.
// Todas incluyen la firma corporativa Windmar (logo + datos del asesor + redes).
//
// Placeholders soportados (se reemplazan con escape HTML):
//   {{name}}        → nombre del cliente
//   {{asesorName}}  → nombre formal del asesor (Juan Rivera)
//   {{asesorEmail}} → correo del asesor
//   {{documents}}   → texto editable de documentos a pedir
//   {{date}}        → fecha de cita en español (ej. "26 de mayo de 2026")
//   {{time}}        → hora de cita en formato 12h (ej. "2:30 PM")
//   {{product}}     → producto que compró el cliente (bienvenida)
//   {{consultant}}  → consultor asignado al cliente (bienvenida)

// ════════════════════════════════════════
// CONFIGURACIÓN DE LA FIRMA
// ════════════════════════════════════════
// URLs de los assets de la firma. Por ahora apuntan a /email-assets/ (folder en
// public/). Cuando los archivos estén subidos al deploy de Vercel, las imágenes
// se renderizarán correctamente. Si los clientes de correo bloquean imágenes
// externas, el correo igual se ve bien gracias al fallback de texto.
//
// HOST_URL → base absoluta del deploy. Se lee de NEXT_PUBLIC_APP_URL o cae a
// la URL de producción conocida.
const HOST_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://windmar-ai-agent.vercel.app';
const LOGO_URL = `${HOST_URL}/email-assets/windmar-logo.gif`;
const SOCIAL_URL = `${HOST_URL}/email-assets/windmar-social.png`;

// Teléfono corporativo común (extensión es por asesor — futuro)
const PHONE = '787-395-7766';

export interface EmailExtraField {
  /** Identificador único — se usa como placeholder {{key}} en la plantilla */
  key: string;
  /** Label visible al asesor */
  label: string;
  /** Tipo de input a renderizar en el modal */
  type: 'text' | 'textarea' | 'date' | 'time';
  /** Placeholder del input */
  placeholder?: string;
  /** Valor por defecto (precarga el input) */
  defaultValue?: string;
  /** Si es obligatorio para enviar el correo */
  required?: boolean;
}

export interface EmailTemplate {
  /** Identificador estable que viaja al backend */
  id: string;
  /** Label corto que aparece en el selector del modal */
  label: string;
  /** Emoji que ayuda a reconocer la plantilla */
  icon: string;
  /** Descripción breve — cuándo usarla */
  description: string;
  /** Asunto del correo (puede tener placeholders también) */
  subject: string;
  /** Body HTML con placeholders */
  htmlBody: string;
  /** Campos adicionales que esta plantilla requiere */
  extraFields?: EmailExtraField[];
}

// ════════════════════════════════════════
// FIRMA CORPORATIVA WINDMAR
// ════════════════════════════════════════
// HTML con tabla para máxima compatibilidad con clientes de correo (Outlook,
// Gmail, Apple Mail). Las imágenes tienen alt text para fallback cuando se
// bloquean. El diseño imita la firma oficial de Outlook del asesor.
function buildSignature(): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px; border-collapse: collapse; font-family: Arial, Helvetica, sans-serif;">
      <tr>
        <td style="padding-right: 18px; vertical-align: top; border-right: 1.5px solid #d1d5db;">
          <img src="${LOGO_URL}" alt="Windmar Home" width="120" height="120" style="display: block; border: 0; max-width: 120px; height: auto;" />
        </td>
        <td style="padding-left: 18px; vertical-align: top;">
          <p style="margin: 0 0 2px 0; font-size: 16px; font-weight: bold; color: #4f46e5; font-family: Georgia, 'Times New Roman', serif;">
            {{asesorName}}
          </p>
          <p style="margin: 0 0 6px 0; font-size: 13px; color: #d1d5db; font-style: italic;">
            Asesor de soluciones
          </p>
          <p style="margin: 0 0 2px 0; font-size: 13px; font-weight: bold; color: #F7941D;">
            Windmar Group
          </p>
          <p style="margin: 0 0 2px 0; font-size: 13px; font-weight: bold;">
            <a href="mailto:{{asesorEmail}}" style="color: #F7941D; text-decoration: none;">{{asesorEmail}}</a>
          </p>
          <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: bold; color: #F7941D;">
            ${PHONE}
          </p>
          <img src="${SOCIAL_URL}" alt="Windmar Group · Síguenos en redes" width="180" style="display: block; border: 0; max-width: 180px; height: auto;" />
        </td>
      </tr>
    </table>
  `.trim();
}

// Wrap común — envuelve el cuerpo en un div con estilos consistentes
function wrap(innerHtml: string): string {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1B3A5C; line-height: 1.65; max-width: 600px;">
      ${innerHtml}
      ${buildSignature()}
    </div>
  `.trim();
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  // ─── 1. Seguimiento general ───────────────────────────────────────
  {
    id: 'general',
    label: 'Seguimiento general',
    icon: '👋',
    description: 'Cliente con quien ya conversaste — confirmar interés',
    subject: 'Seguimiento — Windmar Home',
    htmlBody: wrap(`
      <p>Estimado/a <strong>{{name}}</strong>,</p>
      <p>Espero que se encuentre muy bien. Le escribo de <strong>Windmar Home</strong> para retomar la conversación que tuvimos y saber si sigue interesado/a en avanzar.</p>
      <p>Quedo atento/a a cualquier duda que tenga. Si me indica el horario que le resulte cómodo, con gusto le doy seguimiento personal.</p>
      <p>Gracias por su tiempo y consideración.</p>
    `),
  },

  // ─── 2. Pedir documentos (editable) ───────────────────────────────
  {
    id: 'documents',
    label: 'Pedir documentos',
    icon: '📄',
    description: 'Solicitar documentos al cliente — editable según necesidad',
    subject: 'Documentos para tu propuesta — Windmar Home',
    htmlBody: wrap(`
      <p>Estimado/a <strong>{{name}}</strong>,</p>
      <p>Para poder armar una propuesta hecha a la medida de su hogar, necesito que me haga llegar:</p>
      <div style="margin: 14px 0; padding: 14px 18px; background-color: #fff7ed; border-left: 4px solid #F7941D; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #1B3A5C; white-space: pre-line;">{{documents}}</p>
      </div>
      <p>Puede responder directamente a este correo adjuntando los documentos en formato foto o PDF. Yo me encargo del resto.</p>
      <p>Quedo pendiente.</p>
    `),
    extraFields: [
      {
        key: 'documents',
        label: 'Documentos a solicitar',
        type: 'textarea',
        placeholder: 'Ej. Factura de LUMA reciente, copia de identificación, etc.',
        defaultValue: '• Una factura reciente de LUMA (últimos 60 días)\n• Copia de identificación con foto',
        required: true,
      },
    ],
  },

  // ─── 3. No contestó la llamada ────────────────────────────────────
  {
    id: 'missed_call',
    label: 'No contestó la llamada',
    icon: '📞',
    description: 'Intentaste llamar — abre la puerta para que él decida horario',
    subject: 'Intenté comunicarme contigo — Windmar Home',
    htmlBody: wrap(`
      <p>Estimado/a <strong>{{name}}</strong>,</p>
      <p>Le escribo porque <strong>traté de comunicarme</strong> con usted por teléfono y no pude alcanzarle. Entiendo que su tiempo es valioso, así que prefiero que sea usted quien me indique cuándo le queda mejor para conversar.</p>
      <p>Puede responder a este correo con un horario que le funcione, o llamarme de regreso cuando lo prefiera.</p>
      <p>Muchas gracias por su atención.</p>
    `),
  },

  // ─── 4. Confirmar cita técnica (con fecha + hora) ─────────────────
  {
    id: 'appointment',
    label: 'Confirmar cita técnica',
    icon: '📅',
    description: 'Confirmar visita técnica con fecha y hora específicas',
    subject: 'Confirmación de visita técnica — Windmar Home',
    htmlBody: wrap(`
      <p>Estimado/a <strong>{{name}}</strong>,</p>
      <p>Le confirmo su <strong>visita técnica</strong> con nuestro equipo de Windmar Home para los siguientes datos:</p>
      <div style="margin: 16px 0; padding: 16px 20px; background-color: #fff7ed; border: 1px solid #F7941D; border-radius: 6px;">
        <p style="margin: 0 0 6px 0; font-size: 14px;">📅 <strong>Fecha:</strong> {{date}}</p>
        <p style="margin: 0; font-size: 14px;">🕐 <strong>Hora:</strong> {{time}}</p>
      </div>
      <p>Nuestro técnico realizará una inspección de su hogar para preparar la propuesta más precisa posible. La visita toma aproximadamente 30 a 45 minutos.</p>
      <p>Si necesita <strong>reagendar</strong>, por favor avíseme con anticipación y lo coordinamos sin problema.</p>
      <p>¡Nos vemos pronto!</p>
    `),
    extraFields: [
      { key: 'date', label: 'Fecha de la visita', type: 'date', required: true },
      { key: 'time', label: 'Hora', type: 'time', defaultValue: '10:00', required: true },
    ],
  },

  // ─── 5. Bienvenida (producto + consultor) ─────────────────────────
  {
    id: 'welcome',
    label: 'Bienvenida',
    icon: '🎉',
    description: 'Bienvenida al cliente nuevo — informar producto y consultor',
    subject: '¡Bienvenido/a a la familia Windmar Home!',
    htmlBody: wrap(`
      <p>Estimado/a <strong>{{name}}</strong>,</p>
      <p>¡Le damos la bienvenida a la familia <strong>Windmar Home</strong>! 🎉</p>
      <p>Es un gusto que confíe en nosotros para esta solución. Llevamos <strong>22 años iluminando hogares en Puerto Rico</strong> y estamos comprometidos con que su experiencia sea excelente de principio a fin.</p>
      <div style="margin: 16px 0; padding: 16px 20px; background-color: #fff7ed; border: 1px solid #F7941D; border-radius: 6px;">
        <p style="margin: 0 0 6px 0; font-size: 14px;">🏠 <strong>Producto adquirido:</strong> {{product}}</p>
        <p style="margin: 0; font-size: 14px;">👤 <strong>Consultor asignado:</strong> {{consultant}}</p>
      </div>
      <p>El consultor asignado será su punto de contacto directo durante todo el proceso. No dude en escribirle o llamarle ante cualquier consulta — estamos para servirle.</p>
      <p>¡Gracias por elegir Windmar Home!</p>
    `),
    extraFields: [
      {
        key: 'product',
        label: 'Producto adquirido',
        type: 'text',
        placeholder: 'Ej. Sistema solar residencial 8kW',
        required: true,
      },
      {
        key: 'consultant',
        label: 'Consultor asignado',
        type: 'text',
        placeholder: 'Nombre del consultor',
        required: true,
      },
    ],
  },
];

/**
 * Busca una plantilla por id. Retorna null si no existe.
 */
export function findTemplate(id: string): EmailTemplate | null {
  return EMAIL_TEMPLATES.find((t) => t.id === id) || null;
}

/**
 * Reemplaza todos los placeholders en el HTML — escapando el contenido
 * para evitar inyección de scripts.
 */
export function renderTemplate(
  template: EmailTemplate,
  vars: {
    name: string;
    asesorName: string;
    asesorEmail: string;
    extras?: Record<string, string>;
  }
): { subject: string; html: string } {
  const allVars: Record<string, string> = {
    name: vars.name,
    asesorName: vars.asesorName,
    asesorEmail: vars.asesorEmail,
  };

  // Procesar campos extra — formatea date/time a español
  if (vars.extras && template.extraFields) {
    for (const field of template.extraFields) {
      const raw = vars.extras[field.key] || '';
      if (field.type === 'date') {
        allVars[field.key] = formatDateES(raw);
      } else if (field.type === 'time') {
        allVars[field.key] = formatTimeES(raw);
      } else {
        allVars[field.key] = raw;
      }
    }
  }

  // Reemplazar placeholders en subject y html
  // El body se escapa por placeholder; las URLs de imágenes y href en la firma
  // se preservan porque están escritas directamente en el template (no son input).
  const replaceAll = (str: string): string =>
    str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const val = allVars[key] ?? '';
      // Si el campo es textarea, convertimos \n a <br> después del escape
      const escaped = escapeHtml(val);
      return escaped.replace(/\n/g, '<br>');
    });

  return {
    subject: replaceAll(template.subject),
    html: replaceAll(template.htmlBody),
  };
}

/**
 * Convierte YYYY-MM-DD a "26 de mayo de 2026" (español).
 */
function formatDateES(yyyyMmDd: string): string {
  if (!yyyyMmDd) return '';
  const m = yyyyMmDd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return yyyyMmDd;
  const [, yStr, mStr, dStr] = m;
  const y = Number(yStr);
  const mo = Number(mStr);
  const d = Number(dStr);
  if (!y || !mo || !d || mo < 1 || mo > 12) return yyyyMmDd;
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  return `${d} de ${months[mo - 1]} de ${y}`;
}

/**
 * Convierte "14:30" a "2:30 PM" (formato 12h en español).
 */
function formatTimeES(hhMm: string): string {
  if (!hhMm) return '';
  const m = hhMm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return hhMm;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (isNaN(h) || isNaN(min) || h < 0 || h > 23 || min < 0 || min > 59) return hhMm;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${min.toString().padStart(2, '0')} ${period}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
