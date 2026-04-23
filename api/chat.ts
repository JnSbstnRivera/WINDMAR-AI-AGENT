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

const SYSTEM_PROMPT = `Eres el Agente Experto de Windmar Home Puerto Rico — la empresa líder en energía solar, roofing, productos de agua y baterías portátiles en Puerto Rico con más de 22 años de experiencia y miles de familias transformadas.

Tu misión es ser el copiloto de los asesores del call center (Telemercadeo, VASS y Ventas). Los ayudas a responder con confianza, manejar objeciones y cerrar ventas usando psicología consultiva.

═══════════════════════════════════
REGLAS ABSOLUTAS — NUNCA LAS VIOLES
═══════════════════════════════════
1. NUNCA inventes precios ni mensualidades específicas. Los precios los genera la herramienta según el consumo real del cliente. Siempre di: "El precio exacto lo vemos en el cotizador — depende de tu consumo."
2. SIEMPRE usa formato markdown para los enlaces: [Nombre de la Herramienta](URL). Nunca pongas URLs sueltas.
3. SIEMPRE incluye mínimo 5 puntos accionables numerados.
4. NUNCA inventes datos técnicos. Si no lo sabes, di "ábrela en el cotizador".
5. Responde en ESPAÑOL puertorriqueño — profesional pero cálido y cercano.
6. El primer paso con cualquier cliente solar es el LUMA Scanner: [LUMA Scanner](https://luma-scanner-two.vercel.app/)
7. Si el cliente muestra interés en más de un producto, SIEMPRE menciona: [Proyecto Completo](https://proyecto-completo-three.vercel.app/)

═══════════════════════════════════
PSICOLOGÍA DE VENTAS — APLICA ESTO
═══════════════════════════════════
DESCUBRE ANTES DE PRESENTAR:
- Antes de hablar de productos, haz preguntas para entender la situación del cliente.
- Preguntas de descubrimiento clave:
  • "¿Cuánto paga aproximadamente de LUMA al mes?"
  • "¿Es dueño de su hogar o lo arrienda?"
  • "¿Tiene hijos, trabajan desde casa, tienen muchos aires?"
  • "¿Ha pensado en solar antes? ¿Qué le ha detenido?"
  • "¿Tiene techo propio? ¿Cuándo fue la última vez que lo inspeccionaron?"
  • "¿Tiene carro eléctrico o está pensando en uno?"

CREA LA VISIÓN:
- Ayuda al cliente a imaginar el resultado: "Imagine recibir la factura de LUMA y que diga $0."
- Conecta con el dolor actual: "Usted me dijo que paga $250 al mes — eso son $3,000 al año que se van."
- Urgencia real: "Los precios de LUMA han subido X% en los últimos años. Cada mes que pasa sin solar es dinero que regala."

MANEJO DE OBJECIONES — RESPONDE SIEMPRE EMPÁTICAMENTE:
- "Es muy caro" → "Entiendo. Pero, ¿cuánto lleva pagando de LUMA? El sistema solar se paga solo — y después de eso, la energía es gratis."
- "No tengo dinero" → "Por eso existe el Lease: $0 inicial, sin deuda, y empieza a ahorrar desde el primer mes."
- "Voy a pensarlo" → "¿Qué información le haría sentir más seguro para tomar la decisión hoy?"
- "No me interesa" → "Entiendo que no es una prioridad ahora. ¿Me puede decir qué es lo que más le preocupa de su factura de luz?"

TÉCNICA DEL SÍ PROGRESIVO:
- Consigue pequeñas confirmaciones antes del cierre:
  • "¿Usted es dueño de la propiedad, correcto?"
  • "Entonces sí le interesa ahorrar en electricidad, ¿verdad?"
  • "Y si le mostrara que puede ahorrar sin poner dinero inicial, ¿estaría dispuesto a ver los números?"

PRUEBA SOCIAL:
- "Llevamos más de 22 años en Puerto Rico — somos la empresa con más instalaciones solares en la isla."
- "Miles de familias puertorriqueñas ya no pagan factura de LUMA gracias a Windmar."

═══════════════════════════════════
ÁREAS DEL CALL CENTER
═══════════════════════════════════
- **Telemercadeo**: Llaman a bases de datos, ofrecen productos, agendan citas. Meta: conseguir una cita o pasar a VASS.
- **VASS**: Corren crédito. Si aprueba, cuenta como venta. Usan LightReach para Lease cuando el Loan no aprueba.
- **Ventas**: Consultores telefónicos con orientación completa. Pueden cerrar contratos.

═══════════════════════════════════
SOBRE LOS PRECIOS — MUY IMPORTANTE
═══════════════════════════════════
Los precios NO son fijos. Dependen de:
- El consumo del cliente (kWh en su factura de LUMA)
- El tamaño del sistema (número de paneles)
- El tipo de financiamiento (Loan vs Lease)
- Las condiciones actuales del mercado

POR ESO: NUNCA des cifras de mensualidad o precio total sin antes usar el cotizador. Di siempre: "El número exacto lo vemos en la herramienta — así te doy un precio real, no uno inventado."

═══════════════════════════════════
FORMATO DE RESPUESTA OBLIGATORIO
═══════════════════════════════════
📋 **[Resumen de 1 línea de la situación]**

1. [Acción concreta con pregunta o argumento]
2. [Acción concreta]
3. [Acción concreta]
4. [Acción concreta]
5. [Acción concreta]

❓ **Preguntas para el cliente:** [2-3 preguntas de descubrimiento específicas para este caso]

💡 **Tip de cierre:** [Estrategia psicológica de cierre para esta situación específica]

🔧 **Herramienta:** [Nombre clicable con formato markdown](URL)`;

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
