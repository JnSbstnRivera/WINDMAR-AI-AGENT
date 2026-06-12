import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { SYSTEM_PROMPT } from '@/lib/prompts';
import { pickRelevantTools, buildToolsContext, toClientCards } from '@/lib/tools';
import { getViewerScope } from '@/lib/zoho-access';
import { getZohoToolDefs, executeZohoTool } from '@/lib/zoho-agent-tools';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 30;

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
// DETECCIÓN DE INTENT DE CALIDAD
// ════════════════════════════════════════
// Si el asesor pregunta sobre la matriz de calidad, el cliente puede renderizar
// una card visual rica bajo la respuesta. 3 variantes según el subtipo:
//   - 'times'     → card grande con el tiempo de espera según área del asesor
//   - 'criticals' → grid de los 8 items críticos
//   - 'matrix'    → mini-dashboard 3 columnas (INICIO 30% · ACTITUD 50% · SEG 20%)
function detectQualityIntent(message: string): 'matrix' | 'criticals' | 'times' | null {
  const lower = message.toLowerCase();
  // Tiempos — más específico, va primero
  if (
    (lower.includes('tiempo') || lower.includes('cuanto') || lower.includes('cuánto')) &&
    (lower.includes('espera') || lower.includes('hold') || lower.includes('hold'))
  ) {
    return 'times';
  }
  if (lower.includes('en hold') || lower.includes('en espera')) {
    return 'times';
  }
  // Críticos
  if (lower.includes('crítico') || lower.includes('critico') || lower.includes('criticos') || lower.includes('críticos')) {
    return 'criticals';
  }
  // Matriz / calidad general
  if (
    lower.includes('matriz de calidad') ||
    lower.includes('calidad de llamada') ||
    lower.includes('me califican') ||
    lower.includes('auditor') ||
    lower.includes('items de calidad') ||
    lower.includes('parametros de calidad') ||
    lower.includes('parámetros de calidad') ||
    lower.includes('mejorar mis llamadas') ||
    lower.includes('sacar 100') ||
    lower.includes('sacarme 100') ||
    /\bcalidad\b/.test(lower)
  ) {
    return 'matrix';
  }
  return null;
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
    // Fecha actual en español PR — crucial para validar vigencia de promociones
    // y dar tono apropiado al día/mes (campañas estacionales, feriados, etc.)
    const fechaActualPR = new Date().toLocaleDateString('es-PR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Puerto_Rico',
    });

    const asesorContext = `DATOS DEL ASESOR ACTUAL Y CONTEXTO:
- Nombre del asesor: ${asesorName}
${departamento ? `- Departamento: ${departamento}` : ''}
${rol ? `- Rol: ${rol}` : ''}
- Fecha actual en PR: ${fechaActualPR}
- Saludo según hora actual en PR: "${greeting}"
- ¿Es el primer mensaje de la conversación? ${isFirstMessage ? 'SÍ — saluda al asesor con: "¡' + greeting + ', ' + asesorName + '! 👋"' : 'NO — NO saludes de nuevo. Mantén el HILO temático.'}
${useWebSearch ? '- ⚠️ WEB SEARCH ACTIVADO: el asesor usó una palabra clave de búsqueda en internet. Cuando uses información de internet, indícalo claramente con 🌐 al inicio y cita la fuente.' : ''}

ZOHO CRM (datos en vivo): tienes herramientas para consultar Zoho — buscar_cliente, mis_leads${rol && rol !== 'Asesor' ? ', asignar_leads, agregar_nota' : ''}. Úsalas cuando el asesor pregunte por clientes, su cartera o seguimientos, en lenguaje natural (NO necesita comandos). Tras traer los datos, actúa como COACH: resume breve y di el próximo paso. ${rol === 'Asesor' ? 'Este usuario es Asesor: solo ve SUS leads (las herramientas ya lo filtran).' : 'Este usuario puede ver todo y asignar/anotar.'}

🧭 GUÍA PARA PETICIONES DE ZOHO (sigue esto al pie):
- "mis leads", "mi cartera", "los míos", "mis leads urgentes" → llama mis_leads SIN el parámetro "asesor" (es la cartera del PROPIO usuario, ${asesorName}). JAMÁS pongas su nombre en "asesor".
- "mis leads urgentes / de seguimiento / ¿a quién llamo primero?" → mis_leads con solo_seguimiento=true.
- "la cartera de [OTRA persona]" → solo si es líder/admin, con NOMBRE COMPLETO o correo (nunca solo el primer nombre — hay decenas de tocayos en Zoho).
- Petición VAGA (ej. "muéstrame leads" sin filtro) → NO interrogues primero: trae el default (15 recientes) y ofrece afinar (por estado, fecha o seguimiento) en los <quick_replies>.
- Si una herramienta te devuelve una LISTA de candidatos para desambiguar, muéstrasela al asesor y pídele que elija por nombre completo — NO elijas tú por él.

🚫 REGLA ABSOLUTA ANTI-INVENCIÓN: JAMÁS fabriques datos de clientes — ni nombres, ni Lead IDs, ni teléfonos, ni tablas. Si el usuario pide leads/clientes, LLAMA la herramienta y muestra SOLO lo que devuelve (con sus enlaces). Si la herramienta no devuelve algo, di que no está en Zoho. Los Lead # reales tienen formato L######  (ej: L792795) — cualquier "LD-0XXXXX" inventado es un error grave.

⚙️ ORDEN DEL TURNO CON HERRAMIENTAS: cuando vayas a usar una herramienta, NO escribas preámbulos ("Voy a traer...") ni bloques <quick_replies> ANTES de llamarla — llama la herramienta directo. El bloque <quick_replies> va UNA sola vez, al FINAL de tu respuesta definitiva (después de los datos).

REGLA DE VIGENCIA: usa la fecha actual de arriba para validar promociones, feriados, campañas estacionales. Si una promoción del knowledge base venció antes de hoy, NO la ofrezcas — dile al asesor que ya venció y que valide con su Office Manager.`;

    // 6. Mensajes (history + user message con contexto inyectado)
    // Las herramientas vienen de Supabase (tabla `tools`) — administrables sin redeploy.
    const { tools: recommendedTools, topic: detectedTopic } = await pickRelevantTools(message, history);
    const toolsContext = buildToolsContext(recommendedTools, detectedTopic);
    const toolCards = toClientCards(recommendedTools);

    const userContent = `${asesorContext}\n\n---\n\n${toolsContext}\n\n---\n\nCONTEXTO KNOWLEDGE BASE:\n${knowledgeContext}\n\n---\n\nPREGUNTA: ${message}`;

    const messages: Anthropic.MessageParam[] = [
      ...history.slice(-8).map(h => ({
        role: (h.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: userContent },
    ];

    // 7. Llamar a Claude Haiku 4.5 con prompt caching + streaming + tool-use (Zoho)
    const anthropic = getAnthropic();

    // Scope para las herramientas de Zoho: Asesor solo ve lo suyo; Líder/Admin
    // ven todo y pueden escribir (asignar/notas).
    const scope = getViewerScope(session);
    const zohoTools = getZohoToolDefs(scope.canSeeAll);
    const tools: Anthropic.Messages.ToolUnion[] = [
      ...(useWebSearch
        ? [{ type: 'web_search_20250305' as const, name: 'web_search' as const, max_uses: 3 }]
        : []),
      ...zohoTools,
    ];

    // INTENCIÓN ZOHO → FORZAR herramienta (tool_choice: any) en la 1ra iteración.
    // Haiku a veces anuncia "voy a traer..." y termina el turno sin llamar la
    // herramienta (visto en producción). Si el mensaje habla de leads/clientes/
    // cartera, lo obligamos a nivel de API: no puede responder sin usar una tool.
    const zohoIntent =
      !useWebSearch &&
      (/(mis?|m[íi]|tus|los|las|el|la|dame|tr[áa]eme|busca|buscame|búscame|mu[ée]strame|ver|necesito|listado|lista|cu[áa]nt[oa]s|cu[áa]les|qui[ée]n(es)?)[\s\S]{0,50}\b(leads?|casos?|cartera|vendid[oa]s?|clientes?|seguimientos?|pipeline|no contesta|citas?)\b/i.test(message) ||
        /\b(mi|la|tu)\s+cartera\b/i.test(message) ||
        /\bleads?\b[\s\S]{0,20}\b(urgentes?|de seguimiento|pendientes?|sin nota)\b/i.test(message) ||
        /\bL\d{5,}\b/.test(message) ||
        /(deja|agrega|pon|escribe)[\s\S]{0,25}\bnota\b/i.test(message) ||
        /\b(re)?asigna(r|me|le)?\b/i.test(message));

    // Espacio de salida: las tablas de leads / respuestas con web search pueden
    // pasar de 1024 tokens y quedaban TRUNCADAS a media tabla. Conversación
    // normal mantiene 1024 (más barato y rápido).
    const maxTokens = zohoIntent || useWebSearch ? 2048 : 1024;

    // 8. Loop agéntico con streaming: piped text deltas; si el modelo pide una
    // herramienta Zoho, la ejecutamos server-side (con scoping) y continuamos.
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
          const convo: Anthropic.MessageParam[] = [...messages];
          let finalMessage: Anthropic.Message | null = null;

          for (let iter = 0; iter < 6; iter++) {
            // 1ra iteración con intención Zoho → el modelo DEBE llamar una
            // herramienta (no puede "anunciar" y terminar sin datos).
            // Iteraciones siguientes: auto (ya tiene el tool_result, redacta).
            const forceTool = iter === 0 && zohoIntent;
            const stream = anthropic.messages.stream({
              model: 'claude-haiku-4-5',
              max_tokens: maxTokens,
              system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
              messages: convo,
              tools,
              ...(forceTool ? { tool_choice: { type: 'any' as const } } : {}),
            });

            for await (const event of stream) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
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

            finalMessage = await stream.finalMessage();

            const toolUses = finalMessage.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
            );

            // Herramientas de cliente (Zoho) → ejecutar y continuar el turno
            if (finalMessage.stop_reason === 'tool_use' && toolUses.length > 0) {
              const results: Anthropic.ToolResultBlockParam[] = [];
              for (const tu of toolUses) {
                const out = await executeZohoTool(
                  tu.name,
                  (tu.input as Record<string, unknown>) || {},
                  scope
                );
                results.push({ type: 'tool_result', tool_use_id: tu.id, content: out });
              }
              convo.push({ role: 'assistant', content: finalMessage.content });
              convo.push({ role: 'user', content: results });
              continue;
            }

            // Herramienta server-side (web_search) pausó → reanudar
            if (finalMessage.stop_reason === 'pause_turn') {
              convo.push({ role: 'assistant', content: finalMessage.content });
              continue;
            }

            break; // end_turn (o cualquier otro) → terminamos
          }

          if (finalMessage) {
            const ttftMs = firstChunkAt - requestStart;
            const totalMs = lastChunkAt - requestStart;
            const throughputCps = totalMs > 0 ? Math.round((totalChars / totalMs) * 1000) : 0;
            console.log('[chat/haiku] usage+timing:', JSON.stringify({
              input: finalMessage.usage.input_tokens,
              output: finalMessage.usage.output_tokens,
              cache_read: finalMessage.usage.cache_read_input_tokens,
              web_search: useWebSearch,
              user: email,
              ttft_ms: ttftMs,
              total_ms: totalMs,
              chunks: chunkCount,
              chars: totalChars,
              throughput_cps: throughputCps,
              max_gap_ms: maxGap,
            }));
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Error interno';
          console.error('[chat/haiku] stream error:', msg);
          controller.enqueue(encoder.encode(`\n\n[Error en el stream: ${msg}]`));
        } finally {
          controller.close();
        }
      },
    });

    // Headers críticos para que el streaming NO sea bufferreado por Vercel/CDN/navegador,
    // + X-Recommended-Tools (URL-encoded JSON con las cards) que el cliente lee
    // para renderizar los botones bajo la respuesta.
    const toolsHeader = encodeURIComponent(JSON.stringify(toolCards));

    // X-Quality-Highlight: indica al cliente que renderice una card visual de
    // calidad bajo la respuesta. El área del asesor permite personalizar tiempos.
    const qualityIntent = detectQualityIntent(message);
    const qualityHeader = qualityIntent
      ? encodeURIComponent(JSON.stringify({
          highlight: qualityIntent,
          area: ['Telemercadeo', 'Ventas', 'Vass'].includes(departamento ?? '') ? departamento : null,
        }))
      : '';

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Transfer-Encoding': 'chunked',
        'X-Recommended-Tools': toolsHeader,
        'X-Quality-Highlight': qualityHeader,
        'Access-Control-Expose-Headers': 'X-Recommended-Tools, X-Quality-Highlight',
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
