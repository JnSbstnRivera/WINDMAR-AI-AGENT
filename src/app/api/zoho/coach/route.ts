import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import Anthropic from '@anthropic-ai/sdk';
import type { ZohoClientFull } from '@/lib/zoho';
import { getViewerScope, ownsLead, NOT_IN_PORTFOLIO_MSG } from '@/lib/zoho-access';

export const runtime = 'nodejs';
export const maxDuration = 20;

let anthropicClient: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.WH_CLAUDE_KEY || process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

/**
 * POST /api/zoho/coach
 * Recibe los datos completos del cliente (de /api/zoho/client) y devuelve
 * sugerencias del COACH IA — qué ofrecer al cliente según su historial real.
 *
 * Body: { client: ZohoClientFull }
 * Response: { suggestions: string (markdown) }
 *
 * REGLA SUPREMA respetada: el coach NO da precios, solo recomienda
 * productos/estrategias para que el asesor los discuta con el cliente.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  let body: { client?: ZohoClientFull };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const client = body.client;
  if (!client?.lead) {
    return NextResponse.json({ error: 'Falta info del cliente' }, { status: 400 });
  }

  // Scoping por dueño (defensa en profundidad — el body viene del cliente):
  // el Asesor no puede pedir coach sobre un lead que no es suyo.
  const scope = getViewerScope(session);
  if (!ownsLead(client.lead, scope)) {
    return NextResponse.json({ error: NOT_IN_PORTFOLIO_MSG }, { status: 403 });
  }

  // Resumen ESTRUCTURADO para el LLM
  const dealsResumen = client.deals
    .slice(0, 8) // máximo 8 deals para no inflar el prompt
    .map(
      (d) =>
        `- "${d.name}" · etapa: ${d.stage || '?'} · producto: ${d.productName || '?'} · creado: ${d.createdAt?.slice(0, 10) || '?'}`
    )
    .join('\n');

  const userPrompt = `Eres el COACH IA de un asesor del call center Windmar Home Puerto Rico.

El asesor acaba de buscar a un cliente en Zoho y obtuvo estos datos REALES:

═══ CLIENTE ═══
Nombre: ${client.lead.fullName}
Email: ${client.lead.email || 'no registrado'}
Teléfono: ${client.lead.mobile || client.lead.phone || 'no registrado'}
Dirección: ${client.lead.address || 'no registrada'}
Etapa actual: ${client.lead.stage || 'sin clasificar'}
Consultor asignado: ${client.summary.consultor}
Sistema comprado/cerrado: ${client.summary.sistemaComprado}

═══ HISTORIAL DE COTIZACIONES (${client.deals.length} totales, ${client.summary.dealsAbiertos} en proceso de instalación) ═══
${dealsResumen || '(Sin cotizaciones previas)'}

═══ TU TRABAJO ═══
El asesor está EN UNA LLAMADA EN VIVO. Sé MUY breve. Máximo 3 secciones, 1-2 bullets cada una, frases cortas. NADA de párrafos largos ni introducciones.

Responde EXACTAMENTE en este formato (markdown, sin título inicial):

**💡 Qué ofrecer**
- (1-2 productos concretos según su historial)

**⚠️ Cuidado**
- (1 objeción/riesgo clave)

**🎯 Próximo paso**
- (1 acción concreta)

REGLAS:
- NUNCA des precios. Si mencionas producto, di "cotízalo con [Cotizador]".
- Si ya tiene placas → sugiere batería / purificador / suavizador.
- Si el consultor asignado es OTRO, dilo en 'Cuidado' (coordinar con él).
- Total: máximo ~80 palabras. Telegráfico.`;

  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 350,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find((c) => c.type === 'text');
    const suggestions =
      textBlock && textBlock.type === 'text'
        ? textBlock.text
        : 'No se pudieron generar sugerencias.';

    return NextResponse.json({ suggestions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error generando sugerencias';
    console.error('[zoho/coach]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
