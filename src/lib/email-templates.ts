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
  /** Si true, el input ocupa toda la fila del grid (no se aparea con otro al lado) */
  fullWidth?: boolean;
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
// Se construye dinámicamente con valores reales (nombre, correo, extensión).
// HTML table para compatibilidad máxima con Outlook/Gmail/Apple Mail.
// Las imágenes apuntan a /email-assets/ del deploy (URLs absolutas para que
// se carguen también cuando el correo se abre desde otro cliente).
function buildSignature(asesorName: string, asesorEmail: string, asesorExt?: string): string {
  const safeName = escapeHtml(asesorName);
  const safeEmail = escapeHtml(asesorEmail);
  const phoneLine = asesorExt
    ? `${PHONE} <strong>Ext. ${escapeHtml(asesorExt)}</strong>`
    : PHONE;

  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px; border-collapse: collapse; font-family: Arial, Helvetica, sans-serif;">
      <tr>
        <td style="padding-right: 18px; vertical-align: top; border-right: 1.5px solid #d1d5db;">
          <img src="${LOGO_URL}" alt="Windmar Home" width="120" height="120" style="display: block; border: 0; max-width: 120px; height: auto;" />
        </td>
        <td style="padding-left: 18px; vertical-align: top;">
          <p style="margin: 0 0 2px 0; font-size: 16px; font-weight: bold; color: #4f46e5; font-family: Georgia, 'Times New Roman', serif;">
            ${safeName}
          </p>
          <p style="margin: 0 0 6px 0; font-size: 13px; color: #6b7280; font-style: italic;">
            Asesor de soluciones
          </p>
          <p style="margin: 0 0 2px 0; font-size: 13px; font-weight: bold; color: #F7941D;">
            Windmar Group
          </p>
          <p style="margin: 0 0 2px 0; font-size: 13px; font-weight: bold;">
            <a href="mailto:${safeEmail}" style="color: #F7941D; text-decoration: none;">${safeEmail}</a>
          </p>
          <p style="margin: 0; font-size: 13px; font-weight: bold; color: #F7941D;">
            ${phoneLine}
          </p>
        </td>
      </tr>
    </table>
  `.trim();
}

// Wrap común — solo div container. La FIRMA se agrega en renderTemplate()
// porque necesita valores reales (no placeholders) para escapar bien.
function wrap(innerHtml: string): string {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1B3A5C; line-height: 1.65; max-width: 600px;">
      ${innerHtml}
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
    subject: 'Seguimiento de nuestra conversación — Windmar Home',
    htmlBody: wrap(`
      <p>Estimado/a <strong>{{name}}</strong>,</p>
      <p>Espero que se encuentre muy bien. Le escribo de parte de <strong>Windmar Home</strong> para dar continuidad a la conversación que tuvimos recientemente.</p>
      <p>Mi interés es asegurarme de que cuente con toda la información necesaria para tomar la mejor decisión y resolver cualquier duda que haya quedado pendiente. Sabemos que decisiones como esta requieren su tiempo y nuestro acompañamiento, por lo que quiero ponerme a su entera disposición.</p>
      <p>Si me comparte el horario que le resulte más cómodo, con gusto coordino una llamada o me acerco con la información que necesite. También puede responder este correo con cualquier pregunta — estaré atento/a a sus comentarios.</p>
      <p>Le agradezco mucho su tiempo y consideración. Quedo a la espera de sus noticias.</p>
    `),
  },

  // ─── 2. Pedir documentos (editable) ───────────────────────────────
  {
    id: 'documents',
    label: 'Pedir documentos',
    icon: '📄',
    description: 'Solicitar documentos al cliente — editable según necesidad',
    subject: 'Documentos requeridos para su propuesta — Windmar Home',
    htmlBody: wrap(`
      <p>Estimado/a <strong>{{name}}</strong>,</p>
      <p>Reciba un cordial saludo de mi parte. Como conversamos, para poder armar una propuesta hecha a la medida de su hogar y sus necesidades reales, necesitaré que me haga llegar la siguiente documentación:</p>
      <div style="margin: 14px 0; padding: 14px 18px; background-color: #fff7ed; border-left: 4px solid #F7941D; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #1B3A5C; white-space: pre-line;">{{documents}}</p>
      </div>
      <p>Puede responder directamente a este correo adjuntando los documentos en formato foto o PDF — lo que le resulte más cómodo. Una vez los reciba, en cuestión de horas tendré lista una propuesta detallada para usted.</p>
      <p>Si tiene alguna duda sobre los documentos requeridos o necesita ayuda para conseguirlos, no dude en escribirme o llamarme. Estoy a su disposición.</p>
      <p>Le agradezco de antemano su tiempo y colaboración. Quedo pendiente de sus documentos.</p>
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
    subject: 'Intenté comunicarme con usted — Windmar Home',
    htmlBody: wrap(`
      <p>Estimado/a <strong>{{name}}</strong>,</p>
      <p>Espero que se encuentre muy bien. Le escribo porque <strong>intenté comunicarme</strong> con usted por teléfono en días recientes y no pude alcanzarle. Sé que el día a día es bastante ocupado, por lo que prefiero respetar su tiempo y que sea usted quien me indique el momento que le resulte más conveniente para conversar.</p>
      <p>Quiero comentarle que sigo a su entera disposición para resolver cualquier duda, ampliar la información que conversamos o avanzar con los siguientes pasos si así lo decide.</p>
      <p>Puede responder a este correo con el horario que le funcione mejor (mañana, tarde o noche) o llamarme de regreso cuando lo prefiera. También puede escribirme directamente sus preguntas y le respondo a la mayor brevedad posible.</p>
      <p>Muchas gracias por su atención y disculpe la insistencia. Quedo atento/a a sus noticias.</p>
    `),
  },

  // ─── 4. Confirmar cita técnica (con fecha + hora + consultor) ─────
  {
    id: 'appointment',
    label: 'Confirmar cita técnica',
    icon: '📅',
    description: 'Confirmar visita técnica con fecha, hora y consultor',
    subject: 'Confirmación de visita técnica — Windmar Home',
    htmlBody: wrap(`
      <p>Estimado/a <strong>{{name}}</strong>,</p>
      <p>Reciba un cordial saludo. Le escribo para confirmar formalmente su <strong>visita técnica</strong> con nuestro equipo especializado de Windmar Home, programada con los siguientes datos:</p>
      <div style="margin: 16px 0; padding: 16px 20px; background-color: #fff7ed; border: 1px solid #F7941D; border-radius: 6px;">
        <p style="margin: 0 0 6px 0; font-size: 14px;">📅 <strong>Fecha:</strong> {{date}}</p>
        <p style="margin: 0 0 6px 0; font-size: 14px;">🕐 <strong>Hora:</strong> {{time}}</p>
        <p style="margin: 0; font-size: 14px;">👤 <strong>Consultor asignado:</strong> {{consultant}}</p>
      </div>
      <p>Durante la visita, nuestro técnico realizará una inspección detallada de su hogar para preparar la propuesta más precisa y ajustada a su realidad. El proceso toma aproximadamente <strong>30 a 45 minutos</strong> y no requiere ninguna preparación de su parte — solo que esté presente para recibirnos y resolver dudas que puedan surgir en el sitio.</p>
      <p>Le pido amablemente que tenga a la mano cualquier documento del hogar (factura LUMA reciente, copia de la escritura si aplica) por si el técnico necesita verificar algún detalle adicional.</p>
      <p>Si por algún motivo necesita <strong>reagendar</strong>, por favor avíseme con la mayor anticipación posible y reorganizamos sin inconvenientes. Mi compromiso es que la visita sea lo más cómoda y eficiente para usted.</p>
      <p>¡Quedo a sus órdenes y nos vemos pronto!</p>
    `),
    extraFields: [
      { key: 'date', label: 'Fecha de la visita', type: 'date', required: true },
      { key: 'time', label: 'Hora', type: 'time', defaultValue: '10:00', required: true },
      {
        key: 'consultant',
        label: 'Consultor asignado',
        type: 'text',
        placeholder: 'Nombre del consultor que hará la visita',
        required: true,
        fullWidth: true,
      },
    ],
  },

  // ─── 5. Enviar documento (cotización / contrato / cualquier cosa) ─
  {
    id: 'send_document',
    label: 'Enviar documento',
    icon: '📎',
    description: 'Envío formal de cotización, copia de contrato, estudio técnico, etc.',
    subject: '{{documentName}} — Windmar Home',
    htmlBody: wrap(`
      <p>Estimado/a <strong>{{name}}</strong>,</p>
      <p>Reciba un cordial saludo de mi parte y de todo el equipo de <strong>Windmar Home</strong>. Espero que se encuentre usted y su familia muy bien.</p>
      <p>Por medio de la presente, y según lo conversado, le hago llegar adjunto el documento que solicitó: <strong>{{documentName}}</strong>. He preparado cada detalle con cuidado para que pueda revisarlo con calma y absoluta claridad.</p>
      <p>Le agradezco mucho si puede revisarlo cuando le resulte conveniente. Por favor tómese el tiempo que necesite — entiendo que decisiones de esta naturaleza merecen un análisis a fondo, y para eso estamos: para acompañarle en el proceso.</p>
      <p>Quedo a su entera disposición para aclarar cualquier consulta, hacer los ajustes que considere necesarios o profundizar en cualquier punto que requiera más detalle. Cualquier comentario que pueda ayudarnos a refinar la propuesta es bienvenido.</p>
      <p>Será un verdadero gusto continuar atendiéndole. Le agradezco profundamente su confianza y el tiempo que dedica a esta gestión.</p>
      <p>Sin otro particular por el momento, quedo atento/a a sus comentarios.</p>
      <p><strong>Atentamente,</strong></p>
    `),
    extraFields: [
      {
        key: 'documentName',
        label: 'Documento que envías',
        type: 'text',
        placeholder: 'Ej. Cotización solar · Copia del contrato · Estudio técnico',
        defaultValue: 'Documento solicitado',
        required: true,
      },
    ],
  },

  // ─── 6. Bienvenida (producto + consultor) ─────────────────────────
  {
    id: 'welcome',
    label: 'Bienvenida',
    icon: '🎉',
    description: 'Bienvenida al cliente nuevo — informar producto y consultor',
    subject: '¡Bienvenido/a a la familia Windmar Home!',
    htmlBody: wrap(`
      <p>Estimado/a <strong>{{name}}</strong>,</p>
      <p>¡Le damos la más cordial bienvenida a la familia <strong>Windmar Home</strong>! 🎉</p>
      <p>Es un verdadero honor que haya confiado en nosotros para esta importante decisión. Llevamos <strong>22 años iluminando hogares en Puerto Rico</strong>, y nuestro compromiso es que su experiencia con nosotros sea excelente desde el primer día hasta muchos años después de la instalación.</p>
      <div style="margin: 16px 0; padding: 16px 20px; background-color: #fff7ed; border: 1px solid #F7941D; border-radius: 6px;">
        <p style="margin: 0 0 6px 0; font-size: 14px;">🏠 <strong>Producto adquirido:</strong> {{product}}</p>
        <p style="margin: 0; font-size: 14px;">👤 <strong>Consultor asignado:</strong> {{consultant}}</p>
      </div>
      <p>El consultor que le hemos asignado será su <strong>punto de contacto directo</strong> durante todo el proceso: desde la coordinación de la instalación, hasta el seguimiento post-venta y cualquier consulta que pueda surgirle en el futuro. No dude en escribirle o llamarle directamente para cualquier necesidad — su rol es asegurarse de que usted esté completamente satisfecho/a en cada etapa.</p>
      <p>En los próximos días recibirá comunicaciones con los siguientes pasos del proceso, así como detalles importantes sobre su instalación. Le recomendamos mantener este correo a la mano como referencia.</p>
      <p>Una vez más, gracias por elegir Windmar Home. Estamos emocionados de poder acompañarle en este paso tan importante para usted y su hogar.</p>
      <p>¡Bienvenido/a a la familia!</p>
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
    /** Extensión telefónica del asesor — opcional, se agrega "Ext. {ext}" en firma */
    asesorExt?: string;
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

  // Reemplazar placeholders del body — escapa contenido y convierte \n a <br>
  const replaceAll = (str: string): string =>
    str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const val = allVars[key] ?? '';
      const escaped = escapeHtml(val);
      return escaped.replace(/\n/g, '<br>');
    });

  // Construir firma con valores reales (no placeholders) — la firma maneja
  // su propio escape internamente para preservar las URLs de imágenes.
  const signature = buildSignature(vars.asesorName, vars.asesorEmail, vars.asesorExt);

  // El htmlBody renderizado + la firma, todo dentro del wrap div del template.
  // Para inyectar la firma DENTRO del wrap (no después), reemplazamos el </div>
  // de cierre de wrap por la firma + </div>.
  const bodyHtml = replaceAll(template.htmlBody);
  const htmlWithSignature = bodyHtml.replace(
    /<\/div>\s*$/,
    `${signature}</div>`
  );

  return {
    subject: replaceAll(template.subject),
    html: htmlWithSignature,
  };
}

/**
 * Convierte el cuerpo de una plantilla a TEXTO PLANO editable.
 * Resuelve placeholders del cliente (name) y campos extra (date, documents, etc.)
 * pero NO incluye la firma (esa se mantiene automática y no editable).
 *
 * Usado cuando el asesor activa "Editar texto" para personalizar el correo
 * de un cliente especial. El resultado se muestra en un textarea.
 */
export function templateBodyToPlainText(
  template: EmailTemplate,
  vars: { name: string; extras?: Record<string, string> }
): string {
  const allVars: Record<string, string> = { name: vars.name };
  if (vars.extras && template.extraFields) {
    for (const field of template.extraFields) {
      const raw = vars.extras[field.key] || '';
      if (field.type === 'date') allVars[field.key] = formatDateES(raw);
      else if (field.type === 'time') allVars[field.key] = formatTimeES(raw);
      else allVars[field.key] = raw;
    }
  }

  // Resolver placeholders (sin escape — vamos a texto plano)
  const resolved = template.htmlBody.replace(/\{\{(\w+)\}\}/g, (_, key) => allVars[key] ?? '');

  // HTML → texto plano legible
  return resolved
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '') // quitar resto de tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n') // colapsar saltos excesivos
    .trim();
}

/**
 * Renderiza un correo con CUERPO PERSONALIZADO (texto plano del asesor).
 * Convierte el texto a párrafos HTML y le agrega la firma corporativa.
 * Usado cuando el asesor editó el texto para un cliente especial.
 */
export function renderCustomEmail(vars: {
  subject: string;
  bodyText: string;
  asesorName: string;
  asesorEmail: string;
  asesorExt?: string;
}): { subject: string; html: string } {
  // Texto plano → párrafos HTML (doble salto = nuevo párrafo, salto simple = <br>)
  const paragraphs = vars.bodyText
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin: 0 0 12px 0;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');

  const signature = buildSignature(vars.asesorName, vars.asesorEmail, vars.asesorExt);
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1B3A5C; line-height: 1.65; max-width: 600px;">
      ${paragraphs}
      ${signature}
    </div>
  `.trim();

  return { subject: vars.subject, html };
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
