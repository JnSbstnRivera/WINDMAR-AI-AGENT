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
// Logo oficial Windmar Home (mismo que usa el PANEL-DE-HERRAMIENTAS) —
// se muestra como banner al inicio del correo para que no luzca vacío.
const HEADER_LOGO_URL = 'https://i.postimg.cc/6T5J2v2G/windmar-logo.png';

// Teléfono corporativo común (extensión es por asesor — futuro)
const PHONE = '787-395-7766';

/**
 * Construye el "cargo" de la firma según el rol y departamento del asesor.
 *
 * Reglas:
 *   Asesor + Ventas       → "Asesor de soluciones / Ventas"
 *   Asesor + Telemercadeo → "Asesor de soluciones / Telemercadeo"
 *   Líder  + Ventas       → "Líder de Ventas"
 *   Líder  + VASS         → "Líder de VASS"
 *   Channel + X           → "Channel - X"
 *   Project M + X         → "Project Manager - X"
 *   (sin depto)           → solo el rol o "Asesor de soluciones"
 */
export function buildAsesorCargo(rol: string | null, departamento: string | null): string {
  const r = (rol || '').toLowerCase().trim();
  const d = (departamento || '').trim();

  // Líder de [Depto] — el departamento es parte del título
  if (r === 'líder' || r === 'lider') {
    return d ? `Líder de ${d}` : 'Líder';
  }

  // Channel / Project Manager — con guion al depto
  if (r === 'channel') {
    return d ? `Channel - ${d}` : 'Channel';
  }
  if (r === 'project m' || r === 'project manager' || r === 'projectm') {
    return d ? `Project Manager - ${d}` : 'Project Manager';
  }

  // Asesor (default) — "de soluciones / [Depto]"
  if (!r || r === 'asesor') {
    return d ? `Asesor de soluciones / ${d}` : 'Asesor de soluciones';
  }

  // Otros roles no contemplados: usa rol tal cual + depto
  const rolCap = (rol || '').charAt(0).toUpperCase() + (rol || '').slice(1).toLowerCase();
  return d ? `${rolCap} / ${d}` : rolCap;
}

export interface EmailExtraField {
  /** Identificador único — se usa como placeholder {{key}} en la plantilla */
  key: string;
  /** Label visible al asesor */
  label: string;
  /** Tipo de input a renderizar en el modal */
  type: 'text' | 'textarea' | 'date' | 'time' | 'select';
  /** Placeholder del input */
  placeholder?: string;
  /** Valor por defecto (precarga el input) */
  defaultValue?: string;
  /** Si es obligatorio para enviar el correo */
  required?: boolean;
  /** Si true, el input ocupa toda la fila del grid (no se aparea con otro al lado) */
  fullWidth?: boolean;
  /** Opciones para type='select' — el value se guarda, el label se muestra */
  options?: Array<{ value: string; label: string }>;
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
  /** Título grande que aparece en el header del correo (al lado del logo).
      Puede tener placeholders {{...}}. Ej: "COTIZACIÓN SOLAR LOAN" */
  headerTitle?: string;
  /** Campos adicionales que esta plantilla requiere */
  extraFields?: EmailExtraField[];
  /** Si true, no permite enviar sin al menos un archivo adjunto.
      Útil para plantillas tipo "cotización" donde el PDF es esencial. */
  requiresAttachment?: boolean;
}

// ════════════════════════════════════════
// FIRMA CORPORATIVA WINDMAR
// ════════════════════════════════════════
// Se construye dinámicamente con valores reales (nombre, correo, extensión).
// HTML table para compatibilidad máxima con Outlook/Gmail/Apple Mail.
// Las imágenes apuntan a /email-assets/ del deploy (URLs absolutas para que
// se carguen también cuando el correo se abre desde otro cliente).
function buildSignature(
  asesorName: string,
  asesorEmail: string,
  asesorCargo: string,
  asesorExt?: string
): string {
  const safeName = escapeHtml(asesorName);
  const safeEmail = escapeHtml(asesorEmail);
  const safeCargo = escapeHtml(asesorCargo || 'Asesor de soluciones');
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
            ${safeCargo}
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

// Banner con el logo Windmar Home + título grande + subtítulo.
// Layout horizontal estilo "cotizador profesional":
//   [LOGO]  │  TÍTULO DEL CORREO
//           │  WINDMAR HOME PROFESSIONAL
//
// Si no se pasa título, fallback al banner antiguo (solo logo centrado).
function buildHeaderBanner(title?: string): string {
  // Sin título → logo solo centrado (fallback)
  if (!title || !title.trim()) {
    return `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 4px 0; border-bottom: 2px solid rgba(247,148,29,0.25);">
        <tr>
          <td align="center" style="padding: 4px 0 8px 0;">
            <img src="${HEADER_LOGO_URL}" alt="Windmar Home" width="180" style="display: block; border: 0; max-width: 180px; height: auto;" />
          </td>
        </tr>
      </table>
    `.trim();
  }

  // Con título → layout horizontal con logo pequeño + separador + textos.
  // El título se preserva en su forma natural (no se fuerza UPPERCASE)
  // porque ahora son títulos conversacionales que se ven mejor en
  // mayúscula inicial (ej. "¿Sigues interesado en energía de la buena?").
  const safeTitle = escapeHtml(title.trim());
  return `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 10px 0; border-bottom: 2px solid rgba(247,148,29,0.25);">
      <tr>
        <td width="80" align="center" valign="middle" style="padding: 6px 12px 8px 0;">
          <img src="${HEADER_LOGO_URL}" alt="Windmar Home" width="64" style="display: block; border: 0; max-width: 64px; height: auto;" />
        </td>
        <td width="2" style="background-color: rgba(247,148,29,0.5); padding: 0; font-size: 0; line-height: 0;">&nbsp;</td>
        <td valign="middle" style="padding: 6px 0 8px 14px;">
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1B3A5C; line-height: 1.25; font-family: Arial, Helvetica, sans-serif;">
            ${safeTitle}
          </p>
          <p style="margin: 4px 0 0 0; font-size: 10px; color: #F7941D; letter-spacing: 2.5px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">
            WINDMAR HOME PROFESSIONAL
          </p>
        </td>
      </tr>
    </table>
  `.trim();
}

// Wrap común — solo div container. Banner y firma se inyectan después en
// renderTemplate(), cuando ya tenemos los placeholders resueltos (el
// headerTitle puede contener {{...}}). El primer <p> recibe margin-top
// reducido para arrancar pegado al separador del banner.
function wrap(innerHtml: string): string {
  const innerCompact = innerHtml.replace(
    /^(\s*)<p(\s|>)/,
    '$1<p style="margin: 6px 0 14px 0;"$2'
  );
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14.5px; color: #1f2937; line-height: 1.7; max-width: 600px;">
      <!--BANNER_PLACEHOLDER-->
      ${innerCompact}
    </div>
  `.trim();
}

// ════════════════════════════════════════
// CATÁLOGO DE PRODUCTOS PARA COTIZACIONES
// ════════════════════════════════════════
// Cada producto define los beneficios y garantías que se inyectan en
// el cuerpo del correo de cotización. NUNCA contienen precios (REGLA
// SUPREMA) — los precios viven exclusivamente en el PDF que el asesor
// adjunta, generado por el cotizador oficial.

export interface QuoteProduct {
  id: string;
  label: string;
  /** Texto que se inserta en "su <producto>" — formato continuo de párrafo */
  productPhrase: string;
  beneficios: string[];
  garantias: string[];
}

export const QUOTE_PRODUCTS: QuoteProduct[] = [
  {
    id: 'placas_loan',
    label: '☀️ Placas (Loan)',
    productPhrase: 'instalación de placas solares con financiamiento Loan',
    beneficios: [
      '• Reduce o elimina por completo su factura mensual de LUMA',
      '• Crédito federal ITC del 30% que recupera parte de su inversión',
      '• Producción de energía estable durante 25 a 30 años',
      '• Aumenta el valor de mercado de su propiedad inmediatamente',
      '• Energía limpia que reduce su huella de carbono',
      '• Operación silenciosa y prácticamente sin mantenimiento',
    ],
    garantias: [
      '• 25 años en paneles solares',
      '• 12 años en el inversor',
      '• 10 años en instalación profesional Windmar',
      '• Soporte técnico directo con nuestro equipo certificado',
    ],
  },
  {
    id: 'powerwall2_loan',
    label: '🔋 Power Wall 2 (Loan)',
    productPhrase: 'batería Power Wall 2 con financiamiento Loan',
    beneficios: [
      '• Respaldo eléctrico continuo durante apagones y mantenimientos',
      '• Protege sus electrodomésticos contra fluctuaciones de voltaje',
      '• Operación 100% silenciosa — sin combustibles ni motor',
      '• Monitoreo inteligente desde su celular en tiempo real',
      '• Sistema escalable: puede añadir paneles solares más adelante',
      '• Sin emisiones, sin ruido, sin olores',
    ],
    garantias: [
      '• 10 años en la batería Power Wall 2',
      '• 10 años en instalación profesional Windmar',
      '• Soporte técnico continuo de por vida',
    ],
  },
  {
    id: 'powerwall3_loan',
    label: '🔋 Power Wall 3 (Loan)',
    productPhrase: 'batería Power Wall 3 con financiamiento Loan',
    beneficios: [
      '• Mayor capacidad de respaldo que el Power Wall 2 (última generación)',
      '• Mantiene su hogar funcionando durante apagones prolongados',
      '• Operación silenciosa con tecnología de última generación',
      '• App de monitoreo avanzada con métricas en tiempo real',
      '• Compatible con futura expansión solar fotovoltaica',
      '• Inversor integrado de alta eficiencia',
    ],
    garantias: [
      '• 10 años en la batería Power Wall 3',
      '• 10 años en instalación profesional Windmar',
      '• Soporte técnico continuo con nuestro equipo',
    ],
  },
  {
    id: 'placas_powerwall3_lease',
    label: '☀️🔋 Placas + Power Wall 3 (Lease)',
    productPhrase: 'sistema completo de Placas + Power Wall 3 con plan Lease (cero pago inicial)',
    beneficios: [
      '• Cero pago inicial — sistema completo instalado sin desembolso',
      '• Pago mensual fijo predecible durante todo el contrato',
      '• Respaldo eléctrico continuo + producción solar diaria',
      '• Mantenimiento integral del sistema incluido sin costo extra',
      '• Estabilidad por años — sin sorpresas en su factura',
      '• Energía limpia desde el primer día sin inversión inicial',
      '• Protección completa de su hogar contra apagones',
    ],
    garantias: [
      '• Mantenimiento integral del sistema durante todo el contrato',
      '• Reemplazo de componentes defectuosos sin costo',
      '• 10 años en instalación profesional Windmar',
      '• Soporte técnico continuo de por vida',
    ],
  },
  {
    id: 'anker',
    label: '⚡ Anker (batería portable)',
    productPhrase: 'batería portable Anker para respaldo móvil',
    beneficios: [
      '• Respaldo móvil — se mueve con usted a donde lo necesite',
      '• Múltiples puertos de salida (AC, USB-C, USB-A) para todos sus equipos',
      '• Carga rápida con tecnología de última generación',
      '• Diseño compacto y ligero — ideal para emergencias y viajes',
      '• Compatible con carga solar para autonomía total',
      '• Pantalla LED clara con estado de carga en tiempo real',
    ],
    garantias: [
      '• 5 años de garantía oficial Anker',
      '• Soporte técnico Windmar incluido',
    ],
  },
  {
    id: 'cisterna',
    label: '🚰 Cisterna de respaldo de agua',
    productPhrase: 'cisterna de respaldo de agua para su hogar',
    beneficios: [
      '• Reserva continua de agua durante interrupciones del servicio',
      '• Tranquilidad sabiendo que su familia nunca se quedará sin agua',
      '• Bomba automática incluida que activa el suministro sin intervención',
      '• Múltiples capacidades disponibles (Ecowater 500 / Hércules 600)',
      '• Material durable certificado para uso potable',
      '• Instalación profesional incluida con conexión a su sistema actual',
    ],
    garantias: [
      '• 10 años en tanque Ecowater 500 (5 años en Hércules 600)',
      '• 2 años en la bomba',
      '• 1 año en la instalación profesional Windmar',
      '• Soporte técnico continuo',
    ],
  },
  {
    id: 'calentador',
    label: '☀️♨️ Calentador solar',
    productPhrase: 'calentador solar de agua',
    beneficios: [
      '• Reduce hasta el 100% del consumo eléctrico de su calentador',
      '• Agua caliente continua aprovechando la energía del sol',
      '• Ahorro mensual visible desde el primer día de instalación',
      '• Energía limpia, sin emisiones contaminantes',
      '• Vida útil de 15 a 20 años con mantenimiento adecuado',
      '• Aumenta el valor y eficiencia de su propiedad',
    ],
    garantias: [
      '• 10 años en tanque y colectores solares',
      '• 5 años en accesorios y componentes',
      '• 1 año en instalación profesional Windmar',
      '• Soporte técnico continuo con nuestro equipo',
    ],
  },
  {
    id: 'reverse_osmosis',
    label: '💧 Reverse Osmosis',
    productPhrase: 'sistema de filtración por ósmosis inversa',
    beneficios: [
      '• Elimina más del 99% de contaminantes, sodio, cloro, plomo y microorganismos',
      '• Agua de calidad embotellada directamente de su grifo',
      '• Ahorro significativo vs comprar agua embotellada cada semana',
      '• Mejora dramáticamente el sabor, claridad y olor del agua',
      '• Instalación bajo el fregadero — no ocupa espacio en su cocina',
      '• Agua segura para toda la familia, incluyendo bebés',
    ],
    garantias: [
      '• 5 años en el sistema',
      '• 1 año en filtros (con servicio de cambio recomendado)',
      '• Servicio técnico continuo Windmar',
    ],
  },
  {
    id: 'suavizador_poe',
    label: '💧 Suavizador POE',
    productPhrase: 'suavizador de agua POE (Point of Entry — agua suave para toda la casa)',
    beneficios: [
      '• Elimina la dureza del agua (calcio y magnesio) en toda su casa',
      '• Protege tuberías, calentador, lavadora y todos sus equipos del sarro',
      '• El jabón y shampoo crean mejor espuma y rinden más',
      '• Reduce manchas en grifería, vidrios, platos y ropa',
      '• Su piel y cabello notarán la diferencia inmediatamente',
      '• Prolonga la vida útil de electrodomésticos significativamente',
      '• Trata TODA el agua del hogar desde el punto de entrada',
    ],
    garantias: [
      '• 10 años en el tanque del suavizador',
      '• 5 años en la válvula de control',
      '• 1 año en instalación profesional Windmar',
      '• Soporte técnico continuo y reabastecimiento de sal',
    ],
  },
];

export function findQuoteProduct(id: string): QuoteProduct | null {
  return QUOTE_PRODUCTS.find((p) => p.id === id) || null;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  // ─── 1. Seguimiento general ───────────────────────────────────────
  {
    id: 'general',
    label: 'Seguimiento general',
    icon: '👋',
    description: 'Cliente con quien ya conversaste — confirmar interés',
    subject: '¿Sigues pensando en tu hogar más eficiente? — Windmar Home',
    headerTitle: '¿Sigues interesado en energía de la buena?',
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
    subject: 'Solo unos detalles más para tu propuesta — Windmar Home',
    headerTitle: 'Solo nos faltan unos detalles',
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
    subject: 'Te llamé y no te alcancé — Windmar Home',
    headerTitle: 'No te alcancé por teléfono',
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
    subject: 'Tu visita técnica está confirmada — Windmar Home',
    headerTitle: 'Nuestro técnico va para allá',
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
    subject: 'Aquí está tu {{documentName}} — Windmar Home',
    headerTitle: 'Tu {{documentName}}',
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

  // ─── 6. Enviar cotización (PDF adjunto + beneficios/garantías dinámicos) ─
  {
    id: 'send_quote',
    label: 'Enviar cotización',
    icon: '🧾',
    description: 'Cotización formal con PDF adjunto · beneficios y garantías según producto',
    subject: 'Tu cotización personalizada · {{quoteProductLabel}} — Windmar Home',
    headerTitle: 'Tu cotización · {{quoteProductLabel}}',
    requiresAttachment: true,
    htmlBody: wrap(`
      <p>Estimado/a <strong>{{name}}</strong>,</p>

      <p>Reciba un cordial saludo de mi parte y de todo el equipo de <strong style="color:#F7941D;">Windmar Home</strong>. Como acordamos en nuestra conversación, le envío con muchísimo gusto la cotización detallada para su <strong>{{quoteProductPhrase}}</strong>.</p>

      <p>Sabemos que decisiones como esta requieren confianza, claridad y un buen acompañamiento — y para eso estamos.</p>

      <!-- ────────── POR QUÉ WINDMAR ────────── -->
      <div style="margin: 22px 0; padding: 18px 22px; background-color: #fff7ed; border: 2px solid #F7941D; border-radius: 10px;">
        <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #F7941D; letter-spacing: 0.06em; text-transform: uppercase;">
          ¿Por qué elegir Windmar Home?
        </p>
        <p style="margin: 0; font-size: 14px; color: #1f2937; line-height: 1.75;">
          Llevamos <strong>22 años iluminando hogares en Puerto Rico</strong> con instalaciones realizadas por <strong>nuestro propio equipo certificado</strong> — no subcontratamos. Cuando elige a Windmar, no compra solo un producto: compra <strong>tranquilidad</strong>, soporte técnico real, <strong>garantías que respaldamos personalmente</strong> y un consultor que estará disponible mucho después de la instalación.
        </p>
      </div>

      <!-- ────────── BENEFICIOS ────────── -->
      <div style="margin: 18px 0; padding: 18px 22px; background-color: #fff7ed; border-left: 5px solid #F7941D; border-radius: 6px;">
        <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #F7941D; letter-spacing: 0.05em;">
          BENEFICIOS PRINCIPALES
        </p>
        <p style="margin: 0; font-size: 14px; color: #1f2937; white-space: pre-line; line-height: 1.85;">{{quoteBeneficios}}</p>
      </div>

      <!-- ────────── GARANTÍAS ────────── -->
      <div style="margin: 18px 0; padding: 18px 22px; background-color: #ecfdf5; border-left: 5px solid #10b981; border-radius: 6px;">
        <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #059669; letter-spacing: 0.05em;">
          GARANTÍAS INCLUIDAS
        </p>
        <p style="margin: 0; font-size: 14px; color: #1f2937; white-space: pre-line; line-height: 1.85;">{{quoteGarantias}}</p>
      </div>

      <p>Le agradezco mucho que revise el <strong>documento PDF adjunto</strong>, donde encontrará los precios específicos, los términos completos y todos los detalles técnicos de su propuesta personalizada.</p>

      <p>Si tiene cualquier consulta sobre los números, los plazos, el proceso de instalación o algún detalle técnico, <strong>escríbame o llámeme cuando guste</strong> — con muchísimo gusto le explico todo personalmente. Mi compromiso es que tome la mejor decisión, sin presión y con toda la información en sus manos.</p>

      <!-- ────────── CIERRE PERSUASIVO ────────── -->
      <div style="margin: 22px 0; padding: 16px 20px; background: linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%); border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 15px; color: #1f2937; font-weight: 600; line-height: 1.6;">
          Hagamos de su hogar el más <strong style="color:#F7941D;">eficiente, seguro y valioso</strong> del vecindario.
        </p>
      </div>

      <p>Sin otro particular por el momento, quedo atento/a a sus comentarios y a la mejor decisión para usted y su familia. Gracias por considerarnos.</p>

      <p><strong>Atentamente,</strong></p>
    `),
    extraFields: [
      {
        key: 'product',
        label: 'Producto cotizado',
        type: 'select',
        required: true,
        fullWidth: true,
        options: QUOTE_PRODUCTS.map((p) => ({ value: p.id, label: p.label })),
      },
    ],
  },

  // ─── 7. Bienvenida (producto + consultor) ─────────────────────────
  {
    id: 'welcome',
    label: 'Bienvenida',
    icon: '🎉',
    description: 'Bienvenida al cliente nuevo — informar producto y consultor',
    subject: 'Bienvenido a la familia del sol — Windmar Home',
    headerTitle: 'Bienvenido a la familia del sol',
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
    /** Cargo formateado (ej. "Asesor de soluciones / Ventas") */
    asesorCargo?: string;
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

  // ── Hook especial para plantilla de COTIZACIÓN ──
  // Resuelve el producto elegido en el dropdown y inyecta:
  //   {{quoteProductLabel}}  → "☀️ Sistema Solar (Placas) — Loan"
  //   {{quoteProductPhrase}} → "sistema solar fotovoltaico con financiamiento Loan"
  //   {{quoteBeneficios}}    → lista con bullets (texto plano con \n)
  //   {{quoteGarantias}}     → lista con checkmarks
  // El replacer escapa y convierte \n a <br>, así que los bullets se ven bien.
  if (template.id === 'send_quote') {
    const productId = vars.extras?.product || '';
    const product = findQuoteProduct(productId);
    if (product) {
      // El label se usa para el subject del correo — quitamos emojis para
      // que no se vean raros en clientes que no soportan emojis bien.
      // El catálogo conserva los emojis del label solo para el dropdown.
      allVars.quoteProductLabel = stripEmojis(product.label);
      allVars.quoteProductPhrase = product.productPhrase;
      // Los bullets ya tienen "• " al inicio en el catálogo — no agregar nada.
      allVars.quoteBeneficios = product.beneficios.join('\n');
      allVars.quoteGarantias = product.garantias.join('\n');
    } else {
      // Producto no seleccionado — placeholders vacíos para que el preview se vea
      allVars.quoteProductLabel = '[selecciona el producto]';
      allVars.quoteProductPhrase = '[producto cotizado]';
      allVars.quoteBeneficios = '[Selecciona un producto para ver sus beneficios]';
      allVars.quoteGarantias = '[Selecciona un producto para ver sus garantías]';
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
  const signature = buildSignature(
    vars.asesorName,
    vars.asesorEmail,
    vars.asesorCargo || 'Asesor de soluciones',
    vars.asesorExt
  );

  // El htmlBody renderizado + la firma, todo dentro del wrap div del template.
  // Para inyectar la firma DENTRO del wrap (no después), reemplazamos el </div>
  // de cierre de wrap por la firma + </div>.
  // Fallback: si por algún motivo el body no termina con </div> (ej. wrap()
  // cambió en el futuro), agregamos la firma al final igual — para que NUNCA
  // salga un correo sin firma.
  const bodyHtml = replaceAll(template.htmlBody);
  const closeDivRegex = /<\/div>\s*$/;
  const htmlWithSignature = closeDivRegex.test(bodyHtml)
    ? bodyHtml.replace(closeDivRegex, `${signature}</div>`)
    : `${bodyHtml}\n${signature}`;

  // Inyectar el banner del header con el título YA resuelto (placeholders
  // como {{quoteProductLabel}} ya están aplicados por replaceAll).
  // El title viene de template.headerTitle — si no existe, banner solo logo.
  const resolvedTitle = template.headerTitle
    ? replaceAll(template.headerTitle).replace(/<[^>]+>/g, '') // sin HTML escapado
    : '';
  const banner = buildHeaderBanner(resolvedTitle || undefined);
  const finalHtml = htmlWithSignature.replace('<!--BANNER_PLACEHOLDER-->', banner);

  return {
    subject: replaceAll(template.subject),
    html: finalHtml,
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
  asesorCargo?: string;
  asesorExt?: string;
  /** Título grande del header (ej "COTIZACIÓN SOLAR LOAN") — opcional */
  headerTitle?: string;
}): { subject: string; html: string } {
  // Texto plano → párrafos HTML (doble salto = nuevo párrafo, salto simple = <br>)
  // El primer párrafo arranca con margin-top: 6px (cerca del banner).
  // El resto: 0 0 12px 0 (sin top, solo separación abajo).
  const paragraphsArr = vars.bodyText
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const paragraphs = paragraphsArr
    .map((p, i) => {
      const margin = i === 0 ? '6px 0 12px 0' : '0 0 12px 0';
      return `<p style="margin: ${margin};">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  const signature = buildSignature(
    vars.asesorName,
    vars.asesorEmail,
    vars.asesorCargo || 'Asesor de soluciones',
    vars.asesorExt
  );
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14.5px; color: #1f2937; line-height: 1.7; max-width: 600px;">
      ${buildHeaderBanner(vars.headerTitle)}
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

/**
 * Quita emojis y símbolos pictográficos de un string, dejando solo letras,
 * dígitos, espacios y puntuación común. Usado para que los labels con emoji
 * (como "☀️ Placas (Loan)") salgan limpios en el subject del correo.
 *
 * Usa la propiedad \p{Extended_Pictographic} de Unicode (requiere flag /u).
 */
function stripEmojis(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}‍️]/gu, '') // emojis + ZWJ + VS-16
    .replace(/\s+/g, ' ') // colapsa espacios múltiples
    .trim();
}
