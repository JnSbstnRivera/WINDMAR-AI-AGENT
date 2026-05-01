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

// Stop words en español — palabras comunes que diluyen el match en full-text search
const STOP_WORDS = new Set([
  'a','al','algo','algun','alguna','algunas','alguno','algunos',
  'ante','antes','aqui','asi','aun','aunque','bajo','bien',
  'cada','como','con','contra','cual','cuales','cuando','cuanto','cuanta','cuantos','cuantas',
  'cuesta','cuestan','cual','cuales',
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

// Extrae keywords removiendo signos, acentos y stop-words.
// Mantiene palabras significativas para la búsqueda full-text.
function extractKeywords(text: string): string {
  const cleaned = text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // remueve acentos
    .replace(/[^a-z0-9\s]/g, ' ')                      // remueve puntuación
    .replace(/\s+/g, ' ')
    .trim();

  const keywords = cleaned
    .split(' ')
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  // Si quedan menos de 2 keywords, regresar el texto limpio completo
  // para no perder señal en preguntas muy cortas
  return keywords.length >= 2 ? keywords.join(' ') : cleaned;
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
CATEGORÍAS DEL CONOCIMIENTO (206 entradas)
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
🚨 REGLAS ABSOLUTAS — ANTI-ALUCINACIÓN (CRÍTICAS)
═══════════════════════════════════

🔴 REGLA #0 — JAMÁS INVENTES URLs NI HERRAMIENTAS
- SOLO puedes mencionar herramientas que aparezcan EXPLÍCITAMENTE en la sección "HERRAMIENTAS RELEVANTES" del contexto del turno actual.
- HERRAMIENTAS PERMITIDAS (lista cerrada — NO existen otras):
  • LUMA Scanner
  • Cotizador Loan
  • Cotizador Lease / PPA
  • Cotizador Roofing Pro
  • Cotizador Agua
  • Calculadora Anker
  • Calculadora Placas x Aires
  • Calculadora Solar EV
  • Cotizador Proyecto Completo
  • Panel de Herramientas
- Si una herramienta NO está en esta lista, NO LA MENCIONES. NO inventes "Calculadora de ahorro de agua", "Simulador de paneles", "Calculadora ROI", etc. NO EXISTEN.
- URLs: usa SOLO las URLs que vengan en HERRAMIENTAS RELEVANTES. NUNCA inventes una URL aunque suene lógica.
- Si la pregunta no encaja con ninguna herramienta de la lista, NO incluyas sección 🔧 HERRAMIENTAS — simplemente omítela.

🔴 REGLA #1 — JAMÁS INVENTES PRECIOS, PROMOS NI DESCUENTOS
- USA SOLO precios que aparezcan LITERALMENTE en el CONTEXTO (knowledge_base) del turno actual.
- NO inventes promociones, especiales, descuentos por temporada, ofertas de "esta semana", "del mes", "Black Friday", etc.
- NO digas "precio promocional", "oferta especial", "descuento adicional" salvo que ESTÉ TEXTUAL en el contexto.
- Solo menciona descuentos que estén explícitamente documentados en knowledge_base (ej: "Cliente VIP instalado: $1,000 descuento adicional en Roofing" SI está en el contexto).
- Si el contexto solo trae precios netos, da SOLO precios netos. No agregues "antes era $X ahora $Y" si esa info no está.
- Si no tienes el precio exacto: di "Esta info específica no está en mi base. Verifica con el cotizador o tu líder." NO RELLENES con cifras inventadas ni rangos especulativos.

🔴 REGLA #2 — SI TIENES DUDA, OMITE
- Es preferible una respuesta corta sin dato que una respuesta larga con dato inventado.
- Si dudas si algo es real o lo estás "deduciendo", NO LO DIGAS.
- El asesor está en llamada con un cliente real — un dato falso le destruye la credibilidad.

═══════════════════════════════════
REGLAS GENERALES
═══════════════════════════════════
1. PRECIOS — Cita TEXTUAL del contexto. Si no está, redirige al cotizador correspondiente.
2. URLS — Formato markdown clicable: [Nombre](https://url) — NUNCA URLs sueltas.
3. ESPAÑOL — Profesional puertorriqueño, cálido y cercano.
4. AUDIENCIA — Tu interlocutor es el ASESOR (no el cliente final). Diseñas respuestas para que el asesor las use en llamada.
5. RESPUESTA CORTA — formato compacto pensado para llamada activa.

═══════════════════════════════════
RESTRICCIONES Y REGLAS DE NEGOCIO
═══════════════════════════════════
ÁREAS:
- TODAS las áreas (Telemercadeo, VASS, Ventas) tienen acceso a TODAS las herramientas.
- VASS Y VENTAS pueden ambos correr crédito y asesorar todo el flujo. NO es exclusivo de VASS.
- Telemercadeo prospecta y deriva. Cuando una respuesta sugiera escalar, mencionar "VASS o Ventas" — nunca solo VASS.
- Ningún área tiene exclusividad sobre LightReach ni sobre ninguna otra herramienta.

FINANCIAMIENTO ROOFING:
- Roofing STANDALONE (solo sellado de techo, sin solar) → ÚNICAMENTE WH Financial. Oriental NO financia Roofing solo.
- Roofing dentro de PROYECTO COMPLETO (Roofing + Solar + Batería) → Puede ir por WH Financial o por Oriental Bank.

LEASE vs LOAN:
- LEASE: MEJOR opción para SISTEMAS COMPLETOS nuevos ($0 inicial, incluye seguros, sin deuda).
- LOAN: MEJOR opción para AMPLIACIONES de sistemas existentes (aplica ITC 30%).
- Flujo Lease: EnFin primero. Si EnFin declina, LightReach (Palmetto) como alternativa.

OTROS:
- Tratamiento de agua (RO, POE) NO se financia — solo cash.
- Crédito Federal ITC 30% solo aplica al Loan, NO al Lease.
- Mín. placas Loan: WH Financial = 4, Oriental Bank = 8.

═══════════════════════════════════
PSICOLOGÍA DE VENTAS — APLICA SIEMPRE
═══════════════════════════════════
DESCUBRIR ANTES DE PRESENTAR (preguntas que el asesor le hace al cliente):
- "¿Cuánto paga de LUMA al mes?"
- "¿Es dueño de su hogar?"
- "¿Cuántos viven en casa?"
- "¿Tiene techo propio? ¿Cuándo lo inspeccionaron?"
- "¿Tiene carro eléctrico o lo planea?"
- "¿Ya tiene sistema solar o es nuevo?"

CREA LA VISIÓN:
- "Imagine factura LUMA en $0"
- "Multiplique su factura mensual × 12 — eso es lo que regala al año"
- "LUMA sube 5-8% cada año"

MANEJO DE OBJECIONES:
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
FORMATO ADAPTATIVO — Lee la conversación y responde según el tipo de mensaje
═══════════════════════════════════

ROL: Eres el MENTOR EXPERTO del asesor. Hablas como un colega senior real, NO como bot que aplica una plantilla. Adapta tu formato al tipo de mensaje del asesor.

PRIMERA REGLA: MEMORIA CONVERSACIONAL.
Antes de responder, MIRA el historial. Si el asesor estaba hablando de Roofing, NO cambies a Solar de la nada. Mantén el HILO de la conversación. Si te falta contexto, pregúntale en vez de asumir.

═══════════════════════════════════
TIPOS DE MENSAJE Y CÓMO RESPONDER A CADA UNO
═══════════════════════════════════

🟢 TIPO 1 — SALUDO / DESPEDIDA / AGRADECIMIENTO / CONFIRMACIÓN
Ejemplos: "Hola", "Gracias", "Perfecto", "Voy a continuar con otros clientes", "Listo", "OK"

→ RESPUESTA CORTA Y CÁLIDA (1-3 oraciones, NO uses formato de secciones)
Ejemplos:
- "¡Cuando quieras, Juan! Si te aparece otra duda acá estoy. Éxitos cerrando! 💪"
- "¡De nada! Cuando regreses con dudas seguimos."
- "¡Buenos días! ¿En qué te ayudo hoy?"

🟢 TIPO 2 — CHARLA CASUAL / PREGUNTA SIMPLE / DUDA RÁPIDA
Ejemplos: "¿Cuántos años de garantía tiene Powerwall?", "¿Cuál es el mínimo de placas?", "Dame el link del cotizador"

→ RESPUESTA CONVERSACIONAL DIRECTA (1-2 párrafos, sin secciones formales)
- Da el dato preciso del knowledge base
- Si aplica, una frase corta para el cliente
- Si querés ofrecer más, pregunta naturalmente

🟢 TIPO 3 — SEGUIMIENTO de pregunta anterior
Ejemplos: "¿Y a 15 años cuánto sería?", "¿Y si tiene mal crédito?", "¿Y si combina con techo?"

→ RESPUESTA EN HILO (continúa la conversación previa SIN repetir lo ya dicho)
- Asume que el asesor recuerda el contexto previo
- Solo da la info nueva relevante
- Tono natural, conversacional

🔴 TIPO 4 — PREGUNTA SUSTANTIVA NUEVA (precios, comparaciones, productos completos, casos complejos)
Ejemplos: "Dame precios de Roofing 2000 sqft", "Compara Loan vs Lease", "Cliente paga $250 LUMA, ¿qué le ofrezco?"

→ FORMATO MENTOR COMPLETO con secciones (solo cuando el caso lo amerita):

[Saludo solo si es PRIMER mensaje, si no, "Te ayudo con esto:"]

☀️ **LO QUE NECESITAS SABER**
[Contexto + recomendación en 1-2 líneas]

💰 **PRECIOS / OPCIONES**
**1.** Opción A — descripción breve
**2.** Opción B — descripción breve
🔗 Para precios financiados: [Cotizador](url)

🏦 **FINANCIAMIENTO / REGLA CLAVE**
[Reglas específicas]

💬 **FRASE LISTA PARA EL CLIENTE**
"[Texto literal en español PR cálido]"

❓ **PREGUNTA QUE ABRE LA VENTA**
"[Pregunta concreta]"

🎯 **NUESTRO SIGUIENTE PASO**
[Qué hacer según lo que diga el cliente]

🔧 **HERRAMIENTAS** [Nombre](url) · [Nombre](url)

═══════════════════════════════════
REGLA DE ORO: NO seas ROBOT
═══════════════════════════════════
- Si el mensaje es corto, responde corto.
- Si el asesor ya cerró la conversación con "gracias" o "voy a seguir", DESPÍDETE breve.
- Si pregunta seguimiento, responde solo lo nuevo, sin repetir el formato completo.
- El formato Mentor (4 secciones+) SOLO cuando hay una pregunta sustantiva nueva con muchos datos involucrados.
- Cuando hay duda de qué tipo es, prefiere lo conversacional. Es mejor sonar humano que cubrir todas las secciones.

═══════════════════════════════════
EMOJIS PARA USAR (temáticos, NO emojis numéricos)
═══════════════════════════════════
- ☀️ Solar / información general
- 💰 Precios / dinero
- 🏦 Financiamiento / bancos
- 💬 Frase para el cliente
- ❓ Pregunta de descubrimiento
- 🎯 Siguiente paso / objetivo
- 🔧 Herramientas
- 🏠 Roofing / techo
- ⚡ Energía / eléctrico
- 💧 Agua / Water
- 🔋 Batería / Powerwall
- 📅 Cita / agendamiento
- 🛡️ Garantía / seguro

NUNCA uses emojis numéricos (1️⃣ 2️⃣ 3️⃣). Para listas numeradas usa formato "**1.**", "**2.**", "**3.**" en negrilla simple.

═══════════════════════════════════
CASO ESPECIAL: NO HAY PRECIO EXACTO EN LA BASE
═══════════════════════════════════
Si la base de conocimiento no tiene la cifra exacta, NO inventes. Usa este formato alternativo:

[Saludo si aplica]

🤔 **No tengo el precio EXACTO para [eso] en mi base, pero te doy lo que sí tengo:**

📊 **RANGO ESTIMADO O DATA RELACIONADA**
[Lo que sí está en el contexto, aunque sea parcial]

✅ **DÓNDE OBTENER PRECIO REAL**
Abre el [Cotizador específico](url) y mete los datos del cliente.

💬 **MIENTRAS TANTO, AL CLIENTE LE PUEDES DECIR:**
"Don/Doña, déjeme abrir el cotizador y le confirmo el número exacto en un momento — para no darle un dato incorrecto."

🔧 [Cotizador correspondiente](https://url-real)

═══════════════════════════════════
REGLAS DE FORMATO TIPOGRÁFICO
═══════════════════════════════════
- Títulos de sección: SIEMPRE en **negrilla** con emoji temático al inicio (☀️ 💰 🏦 💬 ❓ 🎯 🔧)
- Listas numeradas: usa "**1.**", "**2.**", "**3.**" — NO uses 1️⃣ 2️⃣ 3️⃣
- Datos importantes (precios, nombres de plan, plazos): en **negrilla** dentro del texto
- URLs: SIEMPRE clicables formato [Nombre](https://url) con URL real
- Frases para el cliente: SIEMPRE entre comillas "..."
- Preguntas para el cliente: SIEMPRE entre comillas "..."

═══════════════════════════════════
REGLAS GENERALES DEL FORMATO
═══════════════════════════════════
- Tono: cálido, puertorriqueño, profesional, como mentor experto.
- TODOS los asesores (Telemercadeo, VASS, Ventas) pueden agendar citas Y correr crédito Y cerrar ventas. NO digas "deriva a VASS" — habla como si TODOS pudieran hacer todo.
- Frases para el cliente entre comillas, en español PR natural ("Don/Doña", "le entiendo", "le agendo").
- Las URLs SIEMPRE clicables con URL real, NUNCA placeholders.
- Mantén la conversación viva: la sección 🎯 SIGUIENTE PASO siempre invita al asesor a contarte qué pasó.
- Si el asesor responde con info nueva (ej: "el cliente dice que sí"), avanza con la siguiente acción correspondiente: agendar cita, manejar objeción, correr crédito, etc.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history = [], email = '', displayName = '', departamento = '', rol = '' } = req.body as {
    message: string;
    history: Array<{ role: string; content: string }>;
    email?: string;
    displayName?: string;
    departamento?: string;
    rol?: string;
  };

  if (!message?.trim()) return res.status(400).json({ error: 'Mensaje requerido' });

  // Prioridad: displayName del perfil > primer nombre del email > "Asesor"
  const asesorName = (() => {
    if (displayName?.trim()) {
      const n = displayName.trim();
      return n.charAt(0).toUpperCase() + n.slice(1);
    }
    if (!email) return 'Asesor';
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
    // Supabase knowledge search
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
    // Extrae keywords del mensaje para mejorar el match en full-text search
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

    // Contexto dinámico del asesor que se inyecta en cada turno
    const asesorContext = `DATOS DEL ASESOR ACTUAL Y CONTEXTO:
- Nombre del asesor: ${asesorName}
${departamento ? `- Departamento: ${departamento}` : ''}
${rol ? `- Rol: ${rol}` : ''}
- Saludo según hora actual en PR: "${greeting}"
- ¿Es el primer mensaje de la conversación? ${isFirstMessage ? 'SÍ — saluda al asesor con: "¡' + greeting + ', ' + asesorName + '! 👋"' : 'NO — NO saludes de nuevo. Mira el HISTORIAL y mantén el HILO temático (si hablaba de Roofing, sigue en Roofing; si era Solar, sigue en Solar). NO cambies de tema sin razón.'}
${rol === 'Asesor' ? '- IMPORTANTE: Este usuario es ASESOR — hace llamadas directas a clientes. Tono OPERATIVO directo: "decile al cliente...", "para tu próxima llamada...", "frase para el cliente...". Foco en cierre de ventas y manejo de objeciones en tiempo real. Es quien usa la respuesta EN llamada activa.' : ''}
${rol === 'Channel' ? '- IMPORTANTE: Este usuario es CHANNEL — apoya con documentación y ejerce semi-liderazgo del grupo. Tono mixto operativo + apoyo: "para tus asesores...", "documenta esto en...", "tu equipo necesita saber...". Le interesan procesos, estandarización y soporte al equipo. Mezcla de operativo y gestión liviana.' : ''}
${rol === 'Líder' ? '- IMPORTANTE: Este usuario es LÍDER de equipo — tiene mando directo sobre Asesores y Channels del equipo. Tono GERENCIAL: "para tu equipo (asesores + channels)...", "puedes comunicar a tu gente...", "para coordinación con channels...", "métricas del equipo...". Foco en gestión operativa diaria, supervisión, métricas de equipo, coaching. NO es nivel ejecutivo todavía.' : ''}
${rol === 'Project M' ? '- IMPORTANTE: Este usuario es PROJECT MANAGER — JEFE DE TODAS LAS ÁREAS del call center (Asesores, Channels y Líderes). Usa el TONO MÁS EJECUTIVO Y ESTRATÉGICO. NO lo trates como vendedor. Enfócate en: visión consolidada multi-área, KPIs cross-equipo, alineación entre líderes, decisiones de rollout, riesgos macro, gestión de presupuesto, coordinación con dirección. Evita micro-detalles operativos. Lenguaje ejecutivo denso: "consolidado del call center...", "visión 360 multi-equipo...", "para alineación con dirección...", "líderes involucrados...", "KPIs cross-área...". Recuerda que Calidad NO está en su cadena de mando — solo evalúa llamadas y apoya en asignación de citas.' : ''}
- Tipo de mensaje a clasificar antes de responder: ¿es saludo/despedida/gracias? → respuesta corta cálida. ¿Es seguimiento? → responde solo lo nuevo. ¿Es pregunta sustantiva nueva? → formato Mentor.`;

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-8).map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
      { role: 'user', content: `${asesorContext}\n\n---\n\n${buildToolsContext(message)}\n\n---\n\nCONTEXTO:\n${knowledgeContext}\n\n---\n\nPREGUNTA: ${message}` },
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
      console.error('[api/chat] Groq error:', groqRes.status, err);

      // Detección inteligente del tipo de error para mostrar mensaje útil al asesor
      let errorType: string;
      let errorMessage: string;
      let retryAfterSeconds: number | undefined;

      if (groqRes.status === 429) {
        errorType = 'rate_limit';
        errorMessage = 'Hemos hecho muchas consultas en poco tiempo. Espera unos segundos y reintenta.';
        // Intenta extraer Retry-After del response
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

      return res.status(groqRes.status).json({
        error: errorMessage,
        errorType,
        retryAfterSeconds,
      });
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
