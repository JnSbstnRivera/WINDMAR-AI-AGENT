import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { SYSTEM_PROMPT } from '@/lib/prompts';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ════════════════════════════════════════
// HERRAMIENTAS DEL CALL CENTER (lista cerrada — REGLA #0 anti-alucinación)
// ════════════════════════════════════════
const TOOLS = [
  { id: 'luma-scanner', name: 'LUMA Scanner', url: 'https://luma-scanner-two.vercel.app/', whenToUse: 'Primer paso del proceso de venta solar. Cuando el cliente menciona su factura de LUMA, cuánto paga de luz, o quiere saber cuánto ahorra con solar.', triggers: ['luma','factura','bill','luz','paga','consumo','kwh','electricidad','recibo','$200','$150','$300','mensual'] },
  { id: 'cotizador-loan', name: 'Cotizador Loan', url: 'https://cotizador-loan.vercel.app/', whenToUse: 'Cliente quiere ser dueño del sistema solar, buen crédito, aprovechar crédito federal 30%. Oriental Bank, planes 10/15/20/25 años.', triggers: ['loan','préstamo','dueño','oriental bank','crédito federal','30%','comprar','mensualidad','plazo','10 años','15 años','20 años','25 años','correr crédito','financiamiento'] },
  { id: 'cotizador-lease', name: 'Cotizador Lease / PPA', url: 'https://cotizador-lease-ppa.vercel.app/', whenToUse: '$0 inicial, sin deuda, alternativa cuando el Loan no aprueba. LightReach es el dueño. Ideal para crédito limitado.', triggers: ['lease','ppa','lightreach','$0','cero inicial','no quiere préstamo','no aprobó','crédito malo','alternativa','sin inversión'] },
  { id: 'cotizador-roofing', name: 'Cotizador Roofing Pro', url: 'https://cotizador-roofing-pro.vercel.app/', whenToUse: 'Cliente pregunta por techo, goteras, sellado antes de solar. Planes Silver, Gold, Platinum.', triggers: ['roofing','techo','sellado','sello','gotera','roof','silver','gold','platinum','sqft','pies cuadrados','reparar techo'] },
  { id: 'cotizador-agua', name: 'Cotizador Agua', url: 'https://cotizador-agua.vercel.app/', whenToUse: 'Cliente pregunta por sistemas de agua, filtros o calidad del agua.', triggers: ['agua','water','filtro','filtración','purificación','prasa','acueducto','calidad del agua','sistema de agua'] },
  { id: 'calculadora-anker', name: 'Calculadora Anker', url: 'https://calculador-anker.vercel.app/', whenToUse: 'Cliente pregunta por baterías Anker, backup portátil o solución de emergencia.', triggers: ['anker','batería','baterías','battery','backup','portátil','emergencia','huracán','apagón','blackout','power station'] },
  { id: 'calculadora-placas-ac', name: 'Calculadora Placas x Aires', url: 'https://calculadora-placas-aires-acondicion.vercel.app/', whenToUse: 'Cliente quiere saber cuántos paneles necesita según sus aires acondicionados.', triggers: ['aires','aire acondicionado','ac','split','mini split','cuántas placas','cuántos paneles','dimensionar'] },
  { id: 'calculadora-ev', name: 'Calculadora Solar EV', url: 'https://calculadora-solar-ev.vercel.app/', whenToUse: 'Cliente tiene carro eléctrico y quiere cargarlo con energía solar.', triggers: ['carro eléctrico','vehículo eléctrico','ev','tesla','cargar el carro','nissan leaf','chevy bolt','kia','ford mach'] },
  { id: 'proyecto-completo', name: 'Cotizador Proyecto Completo (MAYOR AHORRO)', url: 'https://proyecto-completo-three.vercel.app/', whenToUse: 'SIEMPRE que el cliente muestre interés en más de un producto. Roofing + Solar + Batería con los mayores descuentos.', triggers: ['proyecto completo','todo junto','paquete','los tres','techo y solar','solar y batería','todo en uno','descuento','combo'] },
  { id: 'panel-general', name: 'Panel de Herramientas', url: 'https://panel-de-herramientas-call-center.vercel.app/', whenToUse: 'Acceso rápido a todas las herramientas.', triggers: ['panel','herramientas'] },
];

// ════════════════════════════════════════
// DETECCIÓN DE TÓPICO de la conversación (para routing contextual)
// ════════════════════════════════════════
// Si los últimos N mensajes son sobre Roofing/Water/Solar/etc., damos
// preferencia al cotizador correcto Y excluimos los que NO aplican.
// Esto resuelve el bug de "habla de Roofing y le recomienda Cotizador Loan".
type Topic = 'roofing' | 'water' | 'solar' | 'anker' | 'general';

const TOPIC_KEYWORDS: Record<Exclude<Topic, 'general'>, string[]> = {
  roofing: ['roofing','techo','sellado','sello','gotera','roof','silver','gold','platinum','sqft','pies cuadrados','reparar techo','reparación de techo'],
  water:   ['agua','filtro','filtración','purificación','calentador','soltek','cisterna','ecowater','hércules','reverse osmosis','poe','water care'],
  solar:   ['solar','placa','placas','panel','paneles','kwh','luma','factura','powerwall','batería','baterías','tesla','qcell','itc','lease','loan','enfin','lightreach','sunnova'],
  anker:   ['anker','solix','f2600','f3800','bp2600','c300','power station','portátil','huracán','apagón','blackout'],
};

function detectTopic(message: string, history: Array<{ role: string; content: string }>): Topic {
  // Concatenamos el mensaje actual + últimos 6 turnos para análisis de contexto
  const recent = history.slice(-6).map(h => h.content).join(' ');
  const combined = (message + ' ' + recent).toLowerCase();

  const scores: Record<Exclude<Topic, 'general'>, number> = {
    roofing: 0, water: 0, solar: 0, anker: 0,
  };
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS) as Array<[Exclude<Topic, 'general'>, string[]]>) {
    for (const kw of keywords) {
      // Conteo simple de menciones — más menciones = más relevante
      const matches = combined.split(kw).length - 1;
      scores[topic] += matches;
    }
  }

  const max = Math.max(...Object.values(scores));
  if (max < 2) return 'general'; // muy poca señal → no filtramos

  // Devuelve el topic con score máximo (tiebreak: roofing > water > anker > solar)
  const order: Array<Exclude<Topic, 'general'>> = ['roofing', 'water', 'anker', 'solar'];
  return order.find(t => scores[t] === max) ?? 'general';
}

function buildToolsContext(message: string, history: Array<{ role: string; content: string }>): string {
  const lower = message.toLowerCase();
  const matched = TOOLS.filter(t => t.triggers.some(tr => lower.includes(tr)));

  // Detección de tópico: si la conversación es claramente sobre Roofing/Water/etc.,
  // EXCLUIMOS herramientas que no aplican (ej: Cotizador Loan en conversación Roofing).
  const topic = detectTopic(message, history);
  let filtered = matched;
  if (topic === 'roofing') {
    // Roofing standalone NO usa Cotizador Loan ni Lease (esos son para solar).
    // Si el mensaje mencionó "financiamiento" sin "solar", igual lo excluimos.
    filtered = matched.filter(t => t.id !== 'cotizador-loan' && t.id !== 'cotizador-lease');
    // Y aseguramos que Roofing Pro esté presente
    const rp = TOOLS.find(t => t.id === 'cotizador-roofing');
    if (rp && !filtered.includes(rp)) filtered.unshift(rp);
  } else if (topic === 'water') {
    // Agua no se financia — solo cash. Excluimos Loan/Lease.
    filtered = matched.filter(t => t.id !== 'cotizador-loan' && t.id !== 'cotizador-lease');
  }

  if (filtered.length >= 2) {
    const pc = TOOLS.find(t => t.id === 'proyecto-completo');
    if (pc && !filtered.includes(pc)) filtered.push(pc);
  }
  const relevant = filtered.length ? filtered : [TOOLS.find(t => t.id === 'panel-general')!];
  const topicLabel = topic === 'general' ? '' : `\n[TÓPICO DETECTADO: ${topic.toUpperCase()} — usa SOLO las herramientas listadas abajo]`;
  return `HERRAMIENTAS RELEVANTES:${topicLabel}\n${relevant.map(t => `• ${t.name}: ${t.url}\n  Usar cuando: ${t.whenToUse}`).join('\n\n')}`;
}

// Stop words en español para extracción de keywords del knowledge base
const STOP_WORDS = new Set([
  'a','al','algo','algun','alguna','algunas','alguno','algunos',
  'ante','antes','aqui','asi','aun','aunque','bajo','bien',
  'cada','como','con','contra','cual','cuales','cuando','cuanto','cuanta','cuantos','cuantas',
  'cuesta','cuestan',
  'de','del','desde','donde','durante','e','el','ella','ellas',
  'ellos','en','entre','era','eran','eres','es','esa','esas','ese','eso','esos',
  'esta','estaba','estado','estan','estar','estas','este','estos','estoy',
  'fue','fuera','fueron','ha','habia','habian','han','hasta','hay',
  'la','las','le','les','lo','los','mas','me','mi','mis','mucha','muchas','mucho','muchos','muy',
  'nada','ni','no','nos','nosotros','nuestra','nuestras','nuestro','nuestros',
  'o','os','otra','otras','otro','otros','para','pero','poco','pocos',
  'por','porque','que','quien','quienes','se','sea','sean','segun','ser',
  'si','sido','siempre','sin','sobre','solo','son','soy','su','sus',
  'tambien','tan','tanta','tantas','tanto','tantos','te','tener','tengo','ti','tiene','tienen',
  'todas','todo','todos','tu','tus','un','una','unas','uno','unos',
  'va','vale','vamos','van','vas','vez','y','ya','yo'
]);

function extractKeywords(text: string): string {
  const cleaned = text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const keywords = cleaned
    .split(' ')
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  return keywords.length >= 2 ? keywords.join(' ') : cleaned;
}

// ════════════════════════════════════════
// WEB SEARCH OPT-IN (palabras clave que activan búsqueda en internet)
// ════════════════════════════════════════
const WEB_SEARCH_TRIGGERS = [
  'investiga',
  'busca online',
  'busca en internet',
  'búsqueda en internet',
  'busca en línea',
  'buscar online',
  'actualízame',
  'noticias',
  'tarifa actual',
  'precio actual',
  'última versión',
];

function shouldUseWebSearch(message: string): boolean {
  const lower = message.toLowerCase();
  return WEB_SEARCH_TRIGGERS.some(t => lower.includes(t));
}

// ════════════════════════════════════════
// CLIENTE ANTHROPIC (singleton)
// ════════════════════════════════════════
let anthropicClient: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

// ════════════════════════════════════════
// ROUTE HANDLER (POST /api/chat)
// ════════════════════════════════════════
export async function POST(req: Request) {
  // 1. Validar sesión NextAuth
  const session = await auth();
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: 'No autenticado', errorType: 'auth_error' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const email = session.user.email.toLowerCase();
  const sessionUser = session.user as unknown as Record<string, string | null | undefined>;
  const displayName = sessionUser.displayName ?? null;
  const departamento = sessionUser.departamento ?? null;
  const rol = sessionUser.rol ?? 'Asesor';

  // 2. Parse body
  let body: { message?: string; history?: Array<{ role: string; content: string }> };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido', errorType: 'bad_request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { message, history = [] } = body;
  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: 'Mensaje requerido', errorType: 'bad_request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. Nombre y saludo según hora local PR
  const asesorName = (() => {
    if (displayName?.trim()) {
      const n = displayName.trim();
      return n.charAt(0).toUpperCase() + n.slice(1);
    }
    const local = email.split('@')[0];
    const first = local.includes('.') ? local.split('.')[0] : local;
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  })();

  const greeting = (() => {
    const hourPR = (new Date().getUTCHours() - 4 + 24) % 24;
    if (hourPR < 12) return 'Buenos días';
    if (hourPR < 18) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  const isFirstMessage = history.length === 0;
  const useWebSearch = shouldUseWebSearch(message);

  try {
    const supabase = getSupabaseAdmin();

    // ════════════════════════════════════════
    // 3.5. RATE LIMIT — 30 mensajes/minuto por usuario
    // ════════════════════════════════════════
    // Protege contra spam accidental (bug client, Enter trabado) y limita
    // consumo del TPM compartido de la cuenta Anthropic.
    // Implementación: count de mensajes role='user' del último minuto.
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('messages')
      .select('id, conversation:conversations!inner(user_email)', { count: 'exact', head: true })
      .eq('role', 'user')
      .eq('conversation.user_email', email)
      .gte('created_at', oneMinuteAgo);

    if ((recentCount ?? 0) >= 30) {
      return new Response(JSON.stringify({
        error: 'Estás enviando mensajes muy rápido. Espera unos segundos antes de continuar — esto protege la herramienta para todos los asesores.',
        errorType: 'rate_limit',
        retryAfterSeconds: 30,
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Buscar en knowledge base (Supabase RPC) — RAG mejorado.
    // Estrategia:
    //  a) Traer 12 candidatos (más material a evaluar)
    //  b) Re-rank: dar boost a entradas cuya CATEGORÍA matchea palabras clave
    //     de la intención del asesor (ej: "promo" → PROMOCION_VIGENTE +50%)
    //  c) Quedarse con top 8 finales para no inflar el prompt
    const searchQuery = extractKeywords(message);

    const { data: rawDocs } = await supabase.rpc('search_knowledge', {
      search_query: searchQuery,
      filter_categoria: null,
      filter_area: null,
      result_limit: 12,
    });

    type Doc = { titulo: string; contenido: string; categoria: string; rank?: number };
    const docs = (rawDocs ?? []) as Doc[];

    // Boost por intención del asesor — los términos detectados aumentan la
    // prioridad de entradas en categorías relacionadas.
    const lower = message.toLowerCase();
    const intentBoosts: Array<{ triggers: string[]; categoria: string; boost: number }> = [
      { triggers: ['promo', 'promoción', 'promocion', 'descuento', 'oferta', 'campaña', 'campana', 'madres', 'mes de'], categoria: 'PROMOCION_VIGENTE', boost: 1.5 },
      { triggers: ['precio', 'cuánto', 'cuanto', 'cuesta', 'vale', 'monto'], categoria: 'PRODUCTO_', boost: 1.2 }, // prefix match
      { triggers: ['financiamiento', 'financiar', 'préstamo', 'prestamo', 'loan', 'lease', 'plazo', 'mensualidad'], categoria: 'FINANCIAMIENTO', boost: 1.3 },
      { triggers: ['garantía', 'garantia', 'cubre', 'incluye'], categoria: 'GARANTIA', boost: 1.3 },
      { triggers: ['objeción', 'objecion', 'me dice', 'cliente dice', 'caro', 'no quiere', 'no le interesa'], categoria: 'OBJECION_ARGUMENTO', boost: 1.3 },
      { triggers: ['cotizador', 'herramienta', 'calculadora', 'link', 'enlace'], categoria: 'HERRAMIENTA', boost: 1.2 },
    ];

    const scored = docs.map((d, originalRank) => {
      // Score base: posición inversa (12 - rank). El más relevante por full-text gana.
      let score = 12 - originalRank;
      for (const rule of intentBoosts) {
        const matches = rule.triggers.some((t) => lower.includes(t));
        if (!matches) continue;
        // Soporte para prefix match (ej: PRODUCTO_ matchea PRODUCTO_SOLAR, PRODUCTO_WATER)
        const categoryMatches = rule.categoria.endsWith('_')
          ? d.categoria.startsWith(rule.categoria)
          : d.categoria === rule.categoria;
        if (categoryMatches) score *= rule.boost;
      }
      return { doc: d, score };
    });

    const top8 = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((s) => s.doc);

    const knowledgeContext = top8.length
      ? top8
          .map(d => `## ${d.titulo} [${d.categoria}]\n${d.contenido}`)
          .join('\n\n---\n\n')
      : 'No se encontró información específica para esta consulta.';

    // 5. Contexto del asesor (volátil — se inyecta en cada turno, NO va en el cache)
    const asesorContext = `DATOS DEL ASESOR ACTUAL Y CONTEXTO:
- Nombre del asesor: ${asesorName}
${departamento ? `- Departamento: ${departamento}` : ''}
${rol ? `- Rol: ${rol}` : ''}
- Saludo según hora actual en PR: "${greeting}"
- ¿Es el primer mensaje de la conversación? ${isFirstMessage ? 'SÍ — saluda al asesor con: "¡' + greeting + ', ' + asesorName + '! 👋"' : 'NO — NO saludes de nuevo. Mantén el HILO temático.'}
${useWebSearch ? '- ⚠️ WEB SEARCH ACTIVADO: el asesor usó una palabra clave de búsqueda en internet. Cuando uses información de internet, indícalo claramente con 🌐 al inicio y cita la fuente.' : ''}`;

    // 6. Mensajes (history + user message con contexto inyectado)
    const userContent = `${asesorContext}\n\n---\n\n${buildToolsContext(message, history)}\n\n---\n\nCONTEXTO KNOWLEDGE BASE:\n${knowledgeContext}\n\n---\n\nPREGUNTA: ${message}`;

    const messages: Anthropic.MessageParam[] = [
      ...history.slice(-8).map(h => ({
        role: (h.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: userContent },
    ];

    // 7. Llamar a Claude Haiku 4.5 con prompt caching del SYSTEM_PROMPT + streaming
    const anthropic = getAnthropic();

    const tools: Anthropic.Messages.ToolUnion[] | undefined = useWebSearch
      ? [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: 3,
          },
        ]
      : undefined;

    // max_tokens: 1024 es suficiente para 95% de respuestas (~750 palabras).
    // Si el modelo necesita más, mejor responde corto y completa con un seguimiento —
    // eso es lo natural para una llamada en vivo, no un manual.
    const stream = anthropic.messages.stream({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
      ...(tools ? { tools } : {}),
    });

    // 8. Stream text deltas al cliente (formato plano, mismo contrato que tenía Groq)
    // Métricas de timing para diagnosticar pausas: TTFT, throughput, gaps entre chunks.
    const requestStart = Date.now();
    let firstChunkAt = 0;
    let lastChunkAt = 0;
    let chunkCount = 0;
    let totalChars = 0;
    let maxGap = 0;

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta') {
              if (event.delta.type === 'text_delta') {
                const now = Date.now();
                if (firstChunkAt === 0) firstChunkAt = now;
                else {
                  const gap = now - lastChunkAt;
                  if (gap > maxGap) maxGap = gap;
                }
                lastChunkAt = now;
                chunkCount++;
                totalChars += event.delta.text.length;
                controller.enqueue(encoder.encode(event.delta.text));
              }
            }
          }

          // Log de uso para monitoreo (cache hits, costo) + métricas de timing
          const finalMessage = await stream.finalMessage();
          const ttftMs = firstChunkAt - requestStart;
          const totalMs = lastChunkAt - requestStart;
          const throughputCps = totalMs > 0 ? Math.round((totalChars / totalMs) * 1000) : 0;

          console.log('[chat/haiku] usage+timing:', JSON.stringify({
            input: finalMessage.usage.input_tokens,
            output: finalMessage.usage.output_tokens,
            cache_create: finalMessage.usage.cache_creation_input_tokens,
            cache_read: finalMessage.usage.cache_read_input_tokens,
            web_search: useWebSearch,
            user: email,
            ttft_ms: ttftMs,       // Time to first token (debe ser <500ms ideal)
            total_ms: totalMs,     // Tiempo total del stream
            chunks: chunkCount,    // Número de text_deltas recibidos
            chars: totalChars,
            throughput_cps: throughputCps, // Chars/seg (Haiku ideal: ~600-800)
            max_gap_ms: maxGap,    // Mayor pausa entre chunks (si >300ms hay throttling)
          }));
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Error interno';
          console.error('[chat/haiku] stream error:', msg);
          controller.enqueue(encoder.encode(`\n\n[Error en el stream: ${msg}]`));
        } finally {
          controller.close();
        }
      },
    });

    // Headers críticos para que el streaming NO sea bufferreado por Vercel/CDN/navegador.
    // - X-Accel-Buffering: no  → desactiva buffering de Nginx (Vercel lo respeta)
    // - Cache-Control: no-transform → prevent que algún proxy comprima/junte chunks
    // - Connection: keep-alive → mantiene la conexión abierta para chunks pequeños
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: unknown) {
    // Manejo de errores tipados de Anthropic
    if (error instanceof Anthropic.APIError) {
      let errorType: string;
      let errorMessage: string;
      let retryAfterSeconds: number | undefined;

      if (error instanceof Anthropic.RateLimitError) {
        errorType = 'rate_limit';
        errorMessage = 'Hemos hecho muchas consultas en poco tiempo. Espera unos segundos y reintenta.';
        const ra = error.headers?.get('retry-after');
        if (ra) retryAfterSeconds = parseInt(ra, 10);
      } else if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
        errorType = 'auth_error';
        errorMessage = 'Hay un problema de autenticación con el motor de IA. Avísale a tu líder.';
      } else if (error instanceof Anthropic.InternalServerError) {
        errorType = 'service_unavailable';
        errorMessage = 'El motor de IA está temporalmente caído. Espera 30 segundos e intenta de nuevo.';
      } else if (error instanceof Anthropic.BadRequestError) {
        errorType = 'bad_request';
        errorMessage = 'No pude procesar tu pregunta. Intenta reformularla más corta o específica.';
      } else {
        errorType = 'unknown';
        errorMessage = 'Algo inesperado pasó. Intenta de nuevo en un momento.';
      }

      console.error('[chat/haiku]', error.status, error.message);
      return new Response(JSON.stringify({ error: errorMessage, errorType, retryAfterSeconds }), {
        status: error.status ?? 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const msg = error instanceof Error ? error.message : 'Error interno';
    console.error('[chat/haiku] unhandled:', msg);
    return new Response(JSON.stringify({ error: msg, errorType: 'unknown' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
