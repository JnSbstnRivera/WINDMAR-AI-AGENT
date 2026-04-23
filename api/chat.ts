import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

// Tools config (duplicated here for serverless — no src/ imports in api/)
const TOOLS = [
  {
    id: 'luma-scanner',
    name: 'LUMA Scanner',
    url: 'https://luma-scanner-two.vercel.app/',
    whenToUse: 'Primer paso del proceso de venta solar. Cuando el cliente menciona su factura de LUMA, cuánto paga de luz, o quiere saber cuánto ahorra con solar.',
    triggers: ['luma','factura','bill','luz','paga','consumo','kwh','electricidad','recibo','scanner','escanear','$200','$150','$300','mensual'],
  },
  {
    id: 'cotizador-loan',
    name: 'Cotizador Loan',
    url: 'https://cotizador-loan.vercel.app/',
    whenToUse: 'Cliente quiere ser dueño del sistema solar, tiene buen crédito, quiere aprovechar crédito federal 30%. Oriental Bank, planes 10/15/20/25 años.',
    triggers: ['loan','préstamo','dueño','oriental bank','crédito federal','itc','30%','comprar','mensualidad','plazo','10 años','15 años','20 años','25 años','correr crédito','financiamiento'],
  },
  {
    id: 'cotizador-lease',
    name: 'Cotizador Lease / PPA',
    url: 'https://cotizador-lease-ppa.vercel.app/',
    whenToUse: '$0 inicial, sin deuda, alternativa cuando el Loan no aprueba. LightReach es el dueño del sistema. Ideal para crédito limitado.',
    triggers: ['lease','ppa','lightreach','arriendo','$0','cero inicial','no quiere préstamo','no aprobó','crédito malo','alternativa','sin inversión'],
  },
  {
    id: 'cotizador-roofing',
    name: 'Cotizador Roofing Pro',
    url: 'https://cotizador-roofing-pro.vercel.app/',
    whenToUse: 'Cliente pregunta por techo, tiene goteras, quiere sellado antes de instalar solar. Planes Silver, Gold, Platinum.',
    triggers: ['roofing','techo','sellado','sello','gotera','roof','silver','gold','platinum','sqft','pies cuadrados','reparar techo','impermeabilizar'],
  },
  {
    id: 'cotizador-agua',
    name: 'Cotizador Agua',
    url: 'https://cotizador-agua.vercel.app/',
    whenToUse: 'Cliente pregunta por sistemas de agua, filtros, calidad del agua o independizarse de PRASA.',
    triggers: ['agua','water','filtro','filtración','purificación','prasa','acueducto','calidad del agua','sistema de agua','tratamiento','osmosis'],
  },
  {
    id: 'calculadora-anker',
    name: 'Calculadora Anker',
    url: 'https://calculador-anker.vercel.app/',
    whenToUse: 'Cliente pregunta por baterías Anker, backup portátil, solución de emergencia sin sistema completo.',
    triggers: ['anker','batería','baterías','battery','backup','portátil','emergencia','huracán','apagón','blackout','power station','almacenamiento'],
  },
  {
    id: 'calculadora-placas-ac',
    name: 'Calculadora Placas x Aires',
    url: 'https://calculadora-placas-aires-acondicion.vercel.app/',
    whenToUse: 'Cliente quiere saber cuántos paneles necesita según sus aires acondicionados.',
    triggers: ['aires','aire acondicionado','ac','split','mini split','cuántas placas','cuántos paneles','tamaño del sistema','dimensionar'],
  },
  {
    id: 'calculadora-ev',
    name: 'Calculadora Solar EV',
    url: 'https://calculadora-solar-ev.vercel.app/',
    whenToUse: 'Cliente tiene carro eléctrico y quiere cargar su vehículo con energía solar.',
    triggers: ['carro eléctrico','vehículo eléctrico','ev','tesla','cargar el carro','carga solar','paneles para carro','millas','nissan leaf','chevy bolt','kia','ford mach'],
  },
  {
    id: 'proyecto-completo',
    name: 'Cotizador Proyecto Completo (MAYOR AHORRO)',
    url: 'https://proyecto-completo-three.vercel.app/',
    whenToUse: 'SIEMPRE que el cliente muestre interés en más de un producto. Roofing + Solar + Batería en un solo financiamiento con los mayores descuentos de Windmar.',
    triggers: ['proyecto completo','todo junto','paquete','los tres','techo y solar','solar y batería','todo en uno','mayor descuento','descuento','combo','completo'],
  },
  {
    id: 'panel-general',
    name: 'Panel de Herramientas',
    url: 'https://panel-de-herramientas-call-center.vercel.app/',
    whenToUse: 'Acceso rápido a todas las herramientas desde un solo lugar.',
    triggers: ['panel','herramientas','acceso general'],
  },
];

function getRelevantTools(message: string): typeof TOOLS {
  const lower = message.toLowerCase();
  const matched = new Set<(typeof TOOLS)[0]>();

  for (const tool of TOOLS) {
    if (tool.triggers.some((t) => lower.includes(t))) {
      matched.add(tool);
    }
  }

  // If 2+ products detected, always add Proyecto Completo
  if (matched.size >= 2) {
    const pc = TOOLS.find((t) => t.id === 'proyecto-completo');
    if (pc) matched.add(pc);
  }

  if (matched.size === 0) {
    const panel = TOOLS.find((t) => t.id === 'panel-general');
    if (panel) matched.add(panel);
  }

  return Array.from(matched);
}

function buildToolsContext(message: string): string {
  const relevant = getRelevantTools(message);
  const lines = relevant.map(
    (t) => `• ${t.name}: ${t.url}\n  Usar cuando: ${t.whenToUse}`
  );
  return `HERRAMIENTAS RELEVANTES PARA ESTA CONSULTA:\n${lines.join('\n\n')}`;
}

const SYSTEM_PROMPT = `Eres el Agente Experto de Windmar Home Puerto Rico, la empresa líder en energía solar, roofing, productos de agua y baterías portátiles en Puerto Rico con más de 22 años de experiencia.

Tu trabajo es ayudar a los asesores del call center (Telemercadeo, VASS y Ventas) a responder preguntas de clientes de forma rápida, precisa y enfocada en cerrar ventas.

REGLAS ESTRICTAS:
1. SIEMPRE responde con MÍNIMO 5 puntos accionables numerados. Cada punto debe ser algo que el asesor pueda DECIR o HACER inmediatamente.
2. SIEMPRE incluye precios específicos cuando aplique. No digas "consulta precios", DA el precio.
3. SIEMPRE incluye el enlace directo de la herramienta relevante cuando aplique.
4. SIEMPRE enfócate en BENEFICIOS para el cliente, no solo características técnicas.
5. Si detectas una objeción del cliente, da el argumento de cierre inmediato.
6. Responde en ESPAÑOL puertorriqueño profesional pero cercano.
7. Si no tienes información específica en el contexto, dilo honestamente.
8. Al final de respuestas sobre productos, incluye un "Tip de cierre" breve.
9. Cuando menciones financiamiento, SIEMPRE di las opciones disponibles con montos y plazos.
10. Nunca inventes datos. Solo usa la información del contexto proporcionado.
11. Cuando el cliente muestre interés en más de un producto, SIEMPRE menciona el Cotizador Proyecto Completo: https://proyecto-completo-three.vercel.app/ — tiene los mayores descuentos.
12. El primer paso con cualquier cliente solar es escanear su factura de LUMA con el LUMA Scanner: https://luma-scanner-two.vercel.app/

ÁREAS DEL CALL CENTER:
- Telemercadeo: Llaman a bases de datos, ofrecen productos, agendan citas con consultores
- VASS: Consultores llaman a correr crédito. Si aprueba, cuenta como venta. Usan LightReach para Lease.
- Ventas: Consultores por teléfono, ofrecen productos y corren créditos, orientación telefónica completa

FORMATO DE RESPUESTA:
📋 [Resumen de 1 línea de lo que el asesor necesita saber]

1. [Acción/respuesta concreta]
2. [Acción/respuesta concreta]
3. [Acción/respuesta concreta]
4. [Acción/respuesta concreta]
5. [Acción/respuesta concreta]

💡 Tip de cierre: [Frase o estrategia para cerrar la venta]
🔧 Herramienta: [Nombre + enlace]`;

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
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    const { data: docs } = await supabase.rpc('search_knowledge', {
      search_query: message,
      filter_categoria: null,
      filter_area: null,
      result_limit: 8,
    });

    const knowledgeContext =
      docs && docs.length > 0
        ? (docs as Array<{ titulo: string; contenido: string; categoria: string }>)
            .map((d) => `## ${d.titulo} [${d.categoria}]\n${d.contenido}`)
            .join('\n\n---\n\n')
        : 'No se encontró información específica para esta consulta.';

    const toolsContext = buildToolsContext(message);

    const contents = [
      ...history.slice(-8).map((h) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      })),
      {
        role: 'user',
        parts: [
          {
            text: `${toolsContext}\n\n---\n\nCONTEXTO DE LA BASE DE CONOCIMIENTO:\n${knowledgeContext}\n\n---\n\nPREGUNTA DEL ASESOR:\n${message}`,
          },
        ],
      },
    ];

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');

    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.0-flash',
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    for await (const chunk of stream) {
      if (chunk.text) res.write(chunk.text);
    }

    res.end();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error interno';
    console.error('[api/chat]', msg);
    if (!res.headersSent) {
      res.status(500).json({ error: msg });
    } else {
      res.end();
    }
  }
}
