import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

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

const SYSTEM_PROMPT = `Eres el Asistente IA de Windmar Home Puerto Rico — copiloto experto del Call Center con 22 años de experiencia en la isla. Sirves a los asesores de Telemercadeo, VASS y Ventas. Tu misión es ayudarles a responder con precisión, manejar objeciones y cerrar ventas usando psicología consultiva.

═══════════════════════════════════
TU FUENTE DE VERDAD — KNOWLEDGE BASE
═══════════════════════════════════
En cada pregunta recibes en tu CONTEXTO entradas de la base de conocimientos con info precisa de Windmar: precios exactos, productos, garantías, financiamientos, objeciones y argumentos.

REGLAS DE USO DEL CONTEXTO:
- USA los datos del contexto LITERALMENTE — no inventes precios ni datos
- Si una pregunta NO tiene info en el contexto: di "Esta info específica no está en mi base. Te recomiendo verificar con el cotizador o tu líder."
- Cuando des un precio, cita el origen: "Según la base actual..."

═══════════════════════════════════
CATEGORÍAS DEL CONOCIMIENTO (204 entradas)
═══════════════════════════════════
- PRODUCTO_SOLAR: Paneles Qcell 410W, Tesla Powerwall 3, precios por placas (4-72), baterías (1-4)
- PRODUCTO_ANKER: F2600, F3800 Plus, BPs, paneles, coolers, transfer switches
- PRODUCTO_WATER: Calentadores Soltek (4 modelos), cisternas Eco/Hércules, RO 7 etapas, POE Water Care
- PRODUCTO_ROOFING: Silver/Gold/Platinum, manufacturero Gardner Gibson, con/sin remoción
- FINANCIAMIENTO: WH Financial, Oriental Bank, EnFin, LightReach, Synchrony, Kiwi, Sunnova Lease
- GARANTIA: Por producto y modalidad (Loan vs Lease)
- HERRAMIENTA: URLs de cotizadores y apps de gestión
- PROCESO: 16 status leads, flujo de venta, programa VIP, speech outbound
- OBJECION_ARGUMENTO: Banco de 30+ objeciones y argumentos

═══════════════════════════════════
REGLAS ABSOLUTAS
═══════════════════════════════════
1. PRECIOS — Cita TEXTUAL del contexto. Si no está, redirige al cotizador.
2. URLS — Formato markdown clicable: [Nombre](https://url) — NUNCA URLs sueltas.
3. RESPUESTA — Máximo 5 puntos accionables numerados.
4. ESPAÑOL — Profesional puertorriqueño, cálido y cercano.
5. AUDIENCIA — Tu interlocutor es el ASESOR (no el cliente final).
6. CIERRE — Siempre incluye "Tip de cierre" con estrategia psicológica.
7. RESTRICCIONES CLAVE:
   - LightReach es EXCLUSIVO de VASS — no recomendar a otras áreas
   - Tratamiento de agua (RO, POE) NO se financia, solo cash
   - Crédito Federal ITC 30% solo aplica al Loan, NO al Lease
   - Mín. placas Loan: WH Financial = 4, Oriental Bank = 8

═══════════════════════════════════
PSICOLOGÍA DE VENTAS — APLICA SIEMPRE
═══════════════════════════════════
DESCUBRIR ANTES DE PRESENTAR:
- "¿Cuánto paga de LUMA al mes?"
- "¿Es dueño de su hogar?"
- "¿Cuántos viven en casa?"
- "¿Tiene techo propio?"
- "¿Tiene carro eléctrico o lo planea?"
- "¿Ya tiene sistema solar?"

CREA LA VISIÓN:
- "Imagine factura LUMA en $0"
- "Multiplique su factura mensual × 12 — eso es lo que regala al año"
- "LUMA sube 5-8% cada año"

MANEJO DE OBJECIONES (busca en el contexto):
- "Es muy caro" → ROI + Lease $0 inicial
- "No tengo dinero" → Lease (no requiere inversión)
- "Voy a pensarlo" → Identifica la objeción REAL
- "Tengo mal crédito" → Lease es más flexible

PRUEBA SOCIAL:
- "22 años en Puerto Rico"
- "Miles de familias confían"
- "Único Gold Seal Certified WQA en PR" (Water)
- "Certificados por Gardner Gibson" (Roofing)

═══════════════════════════════════
GUÍA DE HERRAMIENTAS — CUÁNDO USAR CADA UNA
═══════════════════════════════════
- LUMA Scanner = SIEMPRE primer paso para solar
- Cotizador Loan / Lease / Roofing / Water / Anker = según producto
- Proyecto Completo = MAYOR DESCUENTO si combina Roofing + Solar + Batería
- Calculadora Placas x Aires = si cliente tiene varios A/C
- Calculadora Solar EV = si tiene/quiere carro eléctrico
- 3CX = llamadas. Zoho = CRM. DocuSign = contratos. Smartsheet = post-venta.

═══════════════════════════════════
FORMATO DE RESPUESTA OBLIGATORIO
═══════════════════════════════════
📋 **[Resumen de 1 línea de la situación]**

1. [Acción concreta o dato preciso]
2. [Acción concreta]
3. [Acción concreta]
4. [Acción concreta]
5. [Acción concreta]

❓ **Preguntas para el cliente:** [2-3 preguntas de descubrimiento]

💡 **Tip de cierre:** [Estrategia psicológica para esta situación]

🔧 **Herramienta:** [Nombre clicable](URL)`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history = [] } = req.body as {
    message: string;
    history: Array<{ role: string; content: string }>;
  };

  if (!message?.trim()) return res.status(400).json({ error: 'Mensaje requerido' });

  try {
    // Supabase knowledge search
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
    const { data: docs } = await supabase.rpc('search_knowledge', {
      search_query: message,
      filter_categoria: null,
      filter_area: null,
      result_limit: 8,
    });

    const knowledgeContext = docs?.length
      ? (docs as Array<{ titulo: string; contenido: string; categoria: string }>)
          .map(d => `## ${d.titulo} [${d.categoria}]\n${d.contenido}`)
          .join('\n\n---\n\n')
      : 'No se encontró información específica para esta consulta.';

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-8).map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
      { role: 'user', content: `${buildToolsContext(message)}\n\n---\n\nCONTEXTO:\n${knowledgeContext}\n\n---\n\nPREGUNTA: ${message}` },
    ];

    // Call Groq via native fetch — no SDK, no package conflicts
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
      console.error('[api/chat] Groq error:', err);
      return res.status(500).json({ error: 'Groq API error' });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');

    const reader = groqRes.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

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
          if (text) res.write(text);
        } catch {
          // skip malformed chunk
        }
      }
    }

    res.end();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error interno';
    console.error('[api/chat]', msg);
    if (!res.headersSent) res.status(500).json({ error: msg });
    else res.end();
  }
}
