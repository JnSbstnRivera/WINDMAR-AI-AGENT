import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Herramienta del Call Center Windmar. Administrada en Supabase (tabla `tools`).
 * El LLM la recomienda según `triggers` + `topic`; el cliente la renderiza como card.
 */
export interface Tool {
  slug: string;
  name: string;
  url: string;
  description: string | null;
  when_to_use: string;
  triggers: string[];
  topic: ToolTopic;
  category: string;
  icon: string | null;
  is_official: boolean;
  recommend: boolean;
  sort_order: number;
}

export type ToolTopic =
  | 'solar' | 'roofing' | 'water' | 'anker' | 'ev'
  | 'financiamiento' | 'cierre' | 'pre-venta' | 'gestion' | 'general';

/**
 * Subset que se manda al cliente en el header X-Recommended-Tools.
 * Sin `triggers` ni `when_to_use` (eso es solo para el LLM).
 */
export interface ToolCard {
  slug: string;
  name: string;
  url: string;
  description: string | null;
  category: string;
  icon: string | null;
  is_official: boolean;
  /** Para tintar el SVG del icono según dominio en el cliente. */
  topic: ToolTopic;
}

// ════════════════════════════════════════
// CACHE EN MEMORIA (5 minutos)
// ════════════════════════════════════════
// Evita query a Supabase en cada turno. Refresca cuando el admin edita la tabla.
// Si necesitas invalidación inmediata, reinicia el deploy (Vercel reasigna funciones).
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { data: Tool[]; fetchedAt: number } | null = null;

async function loadTools(): Promise<Tool[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  const { data, error } = await getSupabaseAdmin()
    .from('tools')
    .select('slug, name, url, description, when_to_use, triggers, topic, category, icon, is_official, recommend, sort_order')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[tools] load error:', error);
    // Si falla, devolvemos cache vieja si existe (degradación elegante)
    return cache?.data ?? [];
  }

  cache = { data: (data ?? []) as Tool[], fetchedAt: Date.now() };
  return cache.data;
}

// ════════════════════════════════════════
// DETECCIÓN DE TÓPICO
// ════════════════════════════════════════
const TOPIC_KEYWORDS: Record<Exclude<ToolTopic, 'general' | 'gestion'>, string[]> = {
  roofing: ['roofing','techo','sellado','sello','gotera','roof','silver','gold','platinum','sqft','pies cuadrados','reparar techo','reparación de techo'],
  water:   ['agua','filtro','filtración','purificación','calentador','soltek','cisterna','ecowater','hércules','reverse osmosis','poe','water care'],
  solar:   ['solar','placa','placas','panel','paneles','kwh','luma','factura','powerwall','batería','baterías','tesla','qcell','itc','lease','loan','enfin','lightreach','sunnova'],
  anker:   ['anker','solix','f2600','f3800','bp2600','c300','power station','portátil','huracán','apagón','blackout'],
  ev:      ['carro eléctrico','vehículo eléctrico','ev','tesla','cargar el carro','nissan leaf','chevy bolt','kia','ford mach'],
  financiamiento: ['financiar','financiamiento','aurora','enfin','palmetto','lightreach','synchrony','kiwi','wh financial','digifi','correr crédito','correr credito'],
  cierre:    ['firmar','firma','contrato','docusign','cerrar venta','cierre','post venta','instalación'],
  'pre-venta': ['validar propiedad','catastro','crim','regrid','medir techo','measuremap','measure map'],
};

function tokenize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function detectTopic(message: string, history: Array<{ role: string; content: string }>): ToolTopic {
  const recent = history.slice(-6).map(h => h.content).join(' ');
  const combined = tokenize(message + ' ' + recent);

  const scores: Record<string, number> = {};
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    let count = 0;
    for (const kw of keywords) {
      const normalized = tokenize(kw);
      // Match con word-boundary aproximado: contar ocurrencias literales del token.
      // No es perfecto pero evita los falsos positivos más obvios de includes().
      const re = new RegExp(`(?:^|[^a-z0-9])${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^a-z0-9]|$)`, 'g');
      const matches = combined.match(re);
      if (matches) count += matches.length;
    }
    scores[topic] = count;
  }

  const max = Math.max(...Object.values(scores));
  if (max < 2) return 'general';

  // Orden de desempate por especificidad
  const order = ['roofing', 'water', 'anker', 'ev', 'cierre', 'pre-venta', 'financiamiento', 'solar'];
  for (const t of order) {
    if (scores[t] === max) return t as ToolTopic;
  }
  return 'general';
}

// ════════════════════════════════════════
// MATCHING DE HERRAMIENTAS
// ════════════════════════════════════════
function wantsOfficial(message: string): boolean {
  const lower = tokenize(message);
  return /\boficial\b/.test(lower) || lower.includes('windmar.com') || lower.includes('cotizacion oficial');
}

function matchTools(message: string, tools: Tool[]): Tool[] {
  const lower = tokenize(message);
  return tools.filter(t => {
    if (!t.recommend) return false;
    return t.triggers.some(trigger => {
      const tn = tokenize(trigger);
      // Triggers con espacios = match literal; triggers de una sola palabra = word boundary
      if (tn.includes(' ')) return lower.includes(tn);
      const re = new RegExp(`(?:^|[^a-z0-9])${tn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^a-z0-9]|$)`);
      return re.test(lower);
    });
  });
}

/**
 * Devuelve la lista de herramientas que el LLM debe considerar para esta consulta,
 * filtradas por topic. Esta lista se inyecta en el prompt Y se manda al cliente
 * para renderizar las cards bajo la respuesta.
 */
export async function pickRelevantTools(
  message: string,
  history: Array<{ role: string; content: string }>
): Promise<{ tools: Tool[]; topic: ToolTopic; officialPreferred: boolean }> {
  const all = await loadTools();
  const topic = detectTopic(message, history);
  const officialPreferred = wantsOfficial(message);
  const matched = matchTools(message, all);

  let filtered = matched;

  // Exclusión por topic — evita que en conversación de roofing aparezca cotizador loan
  if (topic === 'roofing') {
    filtered = filtered.filter(t =>
      t.slug !== 'cotizador-loan' && t.slug !== 'cotizador-lease' &&
      t.slug !== 'cotizador-loan-wh' && t.slug !== 'cotizador-lease-wh'
    );
    // Asegura que el cotizador de roofing principal esté presente
    const roofing = all.find(t => t.slug === (officialPreferred ? 'cotizador-roofing-wh' : 'cotizador-roofing'));
    if (roofing && !filtered.find(t => t.slug === roofing.slug)) filtered.unshift(roofing);
  } else if (topic === 'water') {
    filtered = filtered.filter(t =>
      t.slug !== 'cotizador-loan' && t.slug !== 'cotizador-lease' &&
      t.slug !== 'cotizador-loan-wh' && t.slug !== 'cotizador-lease-wh'
    );
  }

  // Preferencia oficial: si el asesor pidió "oficial", prioriza windmar.com
  if (officialPreferred) {
    filtered.sort((a, b) => {
      if (a.is_official && !b.is_official) return -1;
      if (!a.is_official && b.is_official) return 1;
      return a.sort_order - b.sort_order;
    });
  }

  // Sugerir Proyecto Completo SOLO si hay ≥2 TOPICS DISTINTOS comerciales matched
  // (ej. solar + roofing). Antes contaba tools comerciales — dos tools del mismo
  // topic (LUMA + Enseres, ambos 'solar') activaban PC innecesariamente.
  const distinctCommercialTopics = new Set(
    filtered
      .filter(t => ['solar','roofing','water','anker'].includes(t.topic) && t.slug !== 'proyecto-completo')
      .map(t => t.topic)
  );
  if (distinctCommercialTopics.size >= 2) {
    const pc = all.find(t => t.slug === 'proyecto-completo');
    if (pc && !filtered.find(t => t.slug === 'proyecto-completo')) filtered.push(pc);
  }

  // NOTA: antes había un fallback a "panel-general" cuando no había match —
  // se removió porque generaba ruido visual en respuestas conceptuales
  // (coaching, calidad, objeciones, definiciones). Si el asesor pregunta
  // explícitamente por "panel" o "herramientas", el trigger del panel-general
  // ya lo captura naturalmente — no necesitamos forzarlo.

  // Cap a 6 herramientas máximas (UX + token budget)
  filtered = filtered.slice(0, 6);

  return { tools: filtered, topic, officialPreferred };
}

/**
 * Construye el bloque de texto que se inyecta al prompt del LLM.
 * Las URLs vienen pre-formateadas como markdown link — el LLM tiende a copiar
 * el formato del contexto, así que esto fuerza que la respuesta SIEMPRE tenga
 * la herramienta clicable y no solo el nombre en bold.
 */
export function buildToolsContext(tools: Tool[], topic: ToolTopic): string {
  const topicLabel = topic === 'general'
    ? ''
    : `\n[TÓPICO DETECTADO: ${topic.toUpperCase()} — usa SOLO las herramientas listadas abajo]`;
  return `HERRAMIENTAS RELEVANTES (usa SIEMPRE el formato [Nombre](url) cuando las menciones):${topicLabel}\n${tools.map(t =>
    `• [${t.name}](${t.url}) — Usar cuando: ${t.when_to_use}`
  ).join('\n\n')}`;
}

/**
 * Versión liviana de la lista para mandar al cliente (sin triggers ni when_to_use).
 */
export function toClientCards(tools: Tool[]): ToolCard[] {
  return tools.map(t => ({
    slug: t.slug,
    name: t.name,
    url: t.url,
    description: t.description,
    category: t.category,
    icon: t.icon,
    is_official: t.is_official,
    topic: t.topic,
  }));
}

/**
 * Carga tools por sus slugs (para hidratar tool_refs guardados al cargar conversación).
 */
export async function getToolsBySlugs(slugs: string[]): Promise<ToolCard[]> {
  if (slugs.length === 0) return [];
  const all = await loadTools();
  return slugs
    .map(slug => all.find(t => t.slug === slug))
    .filter((t): t is Tool => Boolean(t))
    .map(t => ({
      slug: t.slug,
      name: t.name,
      url: t.url,
      description: t.description,
      category: t.category,
      icon: t.icon,
      is_official: t.is_official,
      topic: t.topic,
    }));
}
