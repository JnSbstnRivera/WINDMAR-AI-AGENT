import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import Anthropic from '@anthropic-ai/sdk';
import type { ZohoClientFull } from '@/lib/zoho';

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

═══ HISTORIAL DE COTIZACIONES (${client.deals.length} totales, ${client.summary.dealsAbiertos} abiertas) ═══
${dealsResumen || '(Sin cotizaciones previas)'}

═══ TU TRABAJO ═══
Genera una respuesta corta (3-5 secciones cortas con bullets) que ayude al asesor a responder MEJOR a este cliente. Incluye:

1. 📊 **Resumen rápido del cliente** (en 1-2 líneas, qué tipo de cliente es)
2. 💡 **Oportunidades de venta** (qué productos Windmar le puedes ofrecer dado su historial)
3. ⚠️ **Cuidados / objeciones esperables** (qué cuidar al hablar con este cliente)
4. 🎯 **Próximo paso recomendado** (acción concreta de seguimiento)

REGLAS CRÍTICAS:
- NUNCA des precios concretos. Si mencionas un producto, dí "cotízalo con [Cotizador]".
- Si el cliente YA TIENE PLACAS, sugiere complementarias: batería (Power Wall 2/3), purificador de agua, suavizador.
- Si el cliente tiene cotización ABIERTA hace tiempo, recomienda retomarla con call-to-action urgente.
- Si el consultor asignado es OTRO, sugiere coordinar con él antes de contactar (cortesía + ética interna).
- Sé breve y accionable. El asesor está en una llamada en vivo.
- Usa emojis para escanear visualmente.

Responde en markdown.`;

  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 700,
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
