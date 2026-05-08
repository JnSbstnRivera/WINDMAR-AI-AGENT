import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { SYSTEM_PROMPT } from '@/lib/prompts';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ════════════════════════════════════════
// HERRAMIENTAS DEL CALL CENTER (igual que el original)
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

function buildToolsContext(message: string): string {
  const lower = message.toLowerCase();
  const matched = TOOLS.filter(t => t.triggers.some(tr => lower.includes(tr)));
  if (matched.length >= 2) {
    const pc = TOOLS.find(t => t.id === 'proyecto-completo');
    if (pc && !matched.includes(pc)) matched.push(pc);
  }
  const relevant = matched.length ? matched : [TOOLS.find(t => t.id === 'panel-general')!];
  return `HERRAMIENTAS RELEVANTES:\n${relevant.map(t => `• ${t.name}: ${t.url}\n  Usar cuando: ${t.whenToUse}`).join('\n\n')}`;
}

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
// ROUTE HANDLER (POST /api/chat)
// ════════════════════════════════════════
export async function POST(req: Request) {
  // Validar sesión NextAuth
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

  // Nombre del asesor priorizado
  const asesorName = (() => {
    if (displayName?.trim()) {
      const n = displayName.trim();
      return n.charAt(0).toUpperCase() + n.slice(1);
    }
    const local = email.split('@')[0];
    const first = local.includes('.') ? local.split('.')[0] : local;
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  })();

  // Saludo según hora actual en Puerto Rico (UTC-4)
  const greeting = (() => {
    const hourPR = (new Date().getUTCHours() - 4 + 24) % 24;
    if (hourPR < 12) return 'Buenos días';
    if (hourPR < 18) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  const isFirstMessage = history.length === 0;

  try {
    // Buscar en knowledge base
    const supabase = getSupabaseAdmin();
    const searchQuery = extractKeywords(message);

    const { data: docs } = await supabase.rpc('search_knowledge', {
      search_query: searchQuery,
      filter_categoria: null,
      filter_area: null,
      result_limit: 8,
    });

    const knowledgeContext = docs?.length
      ? (docs as Array<{ titulo: string; contenido: string; categoria: string }>)
          .map(d => `## ${d.titulo} [${d.categoria}]\n${d.contenido}`)
          .join('\n\n---\n\n')
      : 'No se encontró información específica para esta consulta.';

    // Contexto del asesor
    const asesorContext = `DATOS DEL ASESOR ACTUAL Y CONTEXTO:
- Nombre del asesor: ${asesorName}
${departamento ? `- Departamento: ${departamento}` : ''}
${rol ? `- Rol: ${rol}` : ''}
- Saludo según hora actual en PR: "${greeting}"
- ¿Es el primer mensaje de la conversación? ${isFirstMessage ? 'SÍ — saluda al asesor con: "¡' + greeting + ', ' + asesorName + '! 👋"' : 'NO — NO saludes de nuevo. Mantén el HILO temático.'}`;

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-8).map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
      { role: 'user', content: `${asesorContext}\n\n---\n\n${buildToolsContext(message)}\n\n---\n\nCONTEXTO:\n${knowledgeContext}\n\n---\n\nPREGUNTA: ${message}` },
    ];

    // Llamar a Groq
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      console.error('[api/chat] Groq error:', groqRes.status, err);

      let errorType: string;
      let errorMessage: string;
      let retryAfterSeconds: number | undefined;

      if (groqRes.status === 429) {
        errorType = 'rate_limit';
        errorMessage = 'Hemos hecho muchas consultas en poco tiempo. Espera unos segundos y reintenta.';
        const retryAfter = groqRes.headers.get('retry-after');
        if (retryAfter) retryAfterSeconds = parseInt(retryAfter, 10);
      } else if (groqRes.status === 401 || groqRes.status === 403) {
        errorType = 'auth_error';
        errorMessage = 'Hay un problema de autenticación con el motor de IA. Avísale a tu líder.';
      } else if (groqRes.status >= 500) {
        errorType = 'service_unavailable';
        errorMessage = 'El motor de IA está temporalmente caído. Espera 30 segundos e intenta de nuevo.';
      } else if (groqRes.status === 400) {
        errorType = 'bad_request';
        errorMessage = 'No pude procesar tu pregunta. Intenta reformularla más corta o específica.';
      } else {
        errorType = 'unknown';
        errorMessage = 'Algo inesperado pasó. Intenta de nuevo en un momento.';
      }

      return new Response(JSON.stringify({
        error: errorMessage,
        errorType,
        retryAfterSeconds,
      }), {
        status: groqRes.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stream la respuesta de Groq al cliente
    const stream = new ReadableStream({
      async start(controller) {
        const reader = groqRes.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const data = trimmed.slice(5).trim();
              if (data === '[DONE]') continue;
              try {
                const json = JSON.parse(data);
                const text = json.choices?.[0]?.delta?.content ?? '';
                if (text) controller.enqueue(new TextEncoder().encode(text));
              } catch {
                // skip malformed chunk
              }
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error interno';
    console.error('[api/chat]', msg);
    return new Response(JSON.stringify({ error: msg, errorType: 'unknown' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
