export type Area = 'Telemercadeo' | 'VASS' | 'Ventas' | 'Todos';
export type Priority = 'alta' | 'media' | 'baja';

export interface Tool {
  id: string;
  name: string;
  url: string;
  description: string;
  whenToUse: string;
  areas: Area[];
  triggers: string[];
  priority: Priority;
}

export const TOOLS: Tool[] = [
  {
    id: 'panel-general',
    name: 'Panel de Herramientas',
    url: 'https://panel-de-herramientas-call-center.vercel.app/',
    description: 'Punto de entrada a todas las herramientas del call center.',
    whenToUse: 'Cuando el asesor no sabe por dónde empezar o necesita acceso rápido a múltiples herramientas.',
    areas: ['Todos'],
    triggers: ['panel', 'herramientas', 'acceso', 'herramienta', 'dónde'],
    priority: 'media',
  },
  {
    id: 'luma-scanner',
    name: 'LUMA Scanner',
    url: 'https://luma-scanner-two.vercel.app/',
    description: 'Escanea y lee facturas de LUMA Energy para analizar el consumo eléctrico del cliente.',
    whenToUse: 'Cuando el cliente tiene su factura de LUMA y quiere saber cuánto puede ahorrar con solar. Es el primer paso del proceso de venta solar.',
    areas: ['Telemercadeo', 'Ventas'],
    triggers: [
      'luma', 'factura', 'bill', 'luz', 'paga en luma', 'consumo', 'kwh',
      'electricidad', 'recibo', 'cuánto paga', 'scanner', 'escanear',
      '$200', '$150', '$300', 'mensual en luma',
    ],
    priority: 'alta',
  },
  {
    id: 'cotizador-loan',
    name: 'Cotizador Loan',
    url: 'https://cotizador-loan.vercel.app/',
    description: 'Cotiza financiamiento solar con préstamo (Loan) de Oriental Bank. Planes de 10, 15, 20 y 25 años. Baterías disponibles solo en plan de 10 años.',
    whenToUse: 'Cuando el cliente quiere ser dueño del sistema solar y aplica para préstamo. Ideal para clientes con buen crédito que quieren aprovechar el crédito federal del 30%.',
    areas: ['VASS', 'Ventas'],
    triggers: [
      'loan', 'préstamo', 'dueño', 'financiamiento', 'oriental bank',
      'crédito federal', 'itc', '30%', 'comprar', 'ownership',
      'cuánto queda pagando', 'mensualidad', 'plazo', '10 años', '15 años',
      '20 años', '25 años', 'correr crédito',
    ],
    priority: 'alta',
  },
  {
    id: 'cotizador-lease',
    name: 'Cotizador Lease / PPA',
    url: 'https://cotizador-lease-ppa.vercel.app/',
    description: 'Cotiza energía solar bajo modelo Lease/PPA con LightReach. Cero inversión inicial, el cliente paga una tarifa mensual fija menor a LUMA.',
    whenToUse: 'Cuando el cliente no quiere deuda, no tiene crédito para loan, o quiere $0 inicial. También es la alternativa cuando el crédito del loan no aprueba en VASS.',
    areas: ['VASS', 'Ventas'],
    triggers: [
      'lease', 'ppa', 'lightreach', 'arriendo', 'sin dueño', '$0',
      'cero inicial', 'no quiere préstamo', 'no quiere deuda', 'no aprobó',
      'crédito malo', 'alternativa', 'sin inversión', 'renta solar',
    ],
    priority: 'alta',
  },
  {
    id: 'cotizador-roofing',
    name: 'Cotizador Roofing Pro',
    url: 'https://cotizador-roofing-pro.vercel.app/',
    description: 'Cotiza sellado y reemplazo de techo. Tres planes: Silver, Gold y Platinum.',
    whenToUse: 'Cuando el cliente pregunta por el techo, tiene goteras, quiere preparar el techo antes del solar, o quiere saber cuánto cuesta sellar.',
    areas: ['Todos'],
    triggers: [
      'roofing', 'techo', 'sellado', 'sello', 'gotera', 'goteras',
      'roof', 'silver', 'gold', 'platinum', 'sqft', 'pies cuadrados',
      'reparar techo', 'techo nuevo', 'impermeabilizar',
    ],
    priority: 'alta',
  },
  {
    id: 'cotizador-agua',
    name: 'Cotizador Agua',
    url: 'https://cotizador-agua.vercel.app/',
    description: 'Cotiza sistemas de filtración, purificación y tratamiento de agua para el hogar.',
    whenToUse: 'Cuando el cliente pregunta por agua, calidad del agua, filtros, o quiere independizarse del agua de PRASA.',
    areas: ['Todos'],
    triggers: [
      'agua', 'water', 'filtro', 'filtración', 'purificación', 'prasa',
      'acueducto', 'calidad del agua', 'sabor del agua', 'sistema de agua',
      'tratamiento de agua', 'tanque', 'osmosis',
    ],
    priority: 'alta',
  },
  {
    id: 'calculadora-anker',
    name: 'Calculadora Anker',
    url: 'https://calculador-anker.vercel.app/',
    description: 'Calcula y cotiza baterías portátiles y estacionarias de la marca Anker distribuidas por Windmar.',
    whenToUse: 'Cuando el cliente pregunta por baterías Anker, backup de energía portátil, o quiere una solución de emergencia sin instalar sistema completo.',
    areas: ['Todos'],
    triggers: [
      'anker', 'batería', 'baterías', 'battery', 'backup', 'portátil',
      'emergencia', 'huracán', 'apagón', 'blackout', 'generador',
      'almacenamiento', 'power station', 'power bank',
    ],
    priority: 'alta',
  },
  {
    id: 'calculadora-placas-ac',
    name: 'Calculadora Placas x Aires Acondicionados',
    url: 'https://calculadora-placas-aires-acondicion.vercel.app/',
    description: 'Calcula cuántos paneles solares necesita el cliente según sus sistemas de aire acondicionado.',
    whenToUse: 'Cuando el cliente quiere saber cuántas placas necesita basado en sus aires, o cuando tiene varios AC y no sabe el tamaño del sistema.',
    areas: ['Ventas', 'VASS'],
    triggers: [
      'aires', 'aire acondicionado', 'ac', 'split', 'mini split',
      'cuántas placas', 'cuántos paneles', 'tamaño del sistema',
      'dimensionar', 'calcular sistema', 'paneles para mis aires',
    ],
    priority: 'alta',
  },
  {
    id: 'calculadora-ev',
    name: 'Calculadora Solar para Vehículos Eléctricos',
    url: 'https://calculadora-solar-ev.vercel.app/',
    description: 'Calcula paneles solares necesarios para cubrir el consumo de un vehículo eléctrico. Soporta 14 modelos de carros.',
    whenToUse: 'Cuando el cliente tiene o está considerando un carro eléctrico y quiere saber cuántos paneles necesita para cargarlo con solar.',
    areas: ['Ventas'],
    triggers: [
      'carro eléctrico', 'vehículo eléctrico', 'ev', 'tesla', 'electric car',
      'cargar el carro', 'carga solar', 'paneles para carro', 'millas',
      'nissan leaf', 'chevy bolt', 'kia niro', 'ford mach-e', 'hyundai kona',
      'volkswagen id', 'audi etron', 'bmw i3', 'volvo xc40',
    ],
    priority: 'media',
  },
  {
    id: 'proyecto-completo',
    name: 'Cotizador Proyecto Completo',
    url: 'https://proyecto-completo-three.vercel.app/',
    description: 'Cotiza el paquete Roofing + Placas Solares + Batería en un solo financiamiento con los mayores descuentos disponibles.',
    whenToUse: 'Siempre que el cliente muestre interés en más de un producto. Es la oferta con mayor ahorro y los mejores descuentos de Windmar.',
    areas: ['Todos'],
    triggers: [
      'proyecto completo', 'todo junto', 'paquete completo', 'los tres',
      'techo y solar', 'solar y batería', 'techo solar batería',
      'todo en uno', 'mejor precio', 'mayor descuento', 'descuento',
      'bundle', 'combo', 'completo',
    ],
    priority: 'alta',
  },
];

/**
 * Returns tools relevant to a message based on keyword matching.
 * Always includes high-priority tools when multiple product triggers detected.
 */
export function getRelevantTools(message: string): Tool[] {
  const lower = message.toLowerCase();
  const matched = new Set<Tool>();

  for (const tool of TOOLS) {
    if (tool.triggers.some((trigger) => lower.includes(trigger))) {
      matched.add(tool);
    }
  }

  // If client seems interested in multiple products, always add Proyecto Completo
  const multiProductTriggers = ['y', 'también', 'además', 'más', 'todo', 'completo', 'junto'];
  const hasMultiProduct =
    matched.size >= 2 || multiProductTriggers.some((t) => lower.includes(t));
  if (hasMultiProduct) {
    const proyectoCompleto = TOOLS.find((t) => t.id === 'proyecto-completo');
    if (proyectoCompleto) matched.add(proyectoCompleto);
  }

  // If no match, return panel general as fallback
  if (matched.size === 0) {
    const panel = TOOLS.find((t) => t.id === 'panel-general');
    if (panel) matched.add(panel);
  }

  return Array.from(matched).sort((a, b) => {
    const order = { alta: 0, media: 1, baja: 2 };
    return order[a.priority] - order[b.priority];
  });
}

/**
 * Builds the tools section string to inject into the system prompt.
 */
export function buildToolsContext(message: string): string {
  const relevant = getRelevantTools(message);

  const lines = relevant.map(
    (t) => `• ${t.name}: ${t.url}\n  → Usar cuando: ${t.whenToUse}`
  );

  return `HERRAMIENTAS RELEVANTES PARA ESTA CONSULTA:\n${lines.join('\n\n')}`;
}
