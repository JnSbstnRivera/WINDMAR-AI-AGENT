import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 30;

let anthropicClient: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

/**
 * POST /api/upload-luma
 * Recibe una foto (jpg/png/webp) o PDF de la factura LUMA.
 * Usa Claude visión para extraer SOLO el consumo del cliente y recomendar
 * la herramienta correcta. Devuelve el análisis como respuesta del asistente
 * (texto + slugs de herramientas) lista para insertar en el chat.
 *
 * Restricción de privacidad: el archivo NO se guarda. Solo pasa por la
 * memoria del request hacia Anthropic y se descarta.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: 'No autenticado' }, { status: 401 });
  }
  const email = session.user.email.toLowerCase();

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return Response.json({ error: 'Body inválido' }, { status: 400 });
  }
  const file = formData.get('file');
  const conversationId = formData.get('conversation_id') as string | null;
  const additionalMessage = (formData.get('additional_message') as string | null)?.trim() || null;

  if (!file || typeof file === 'string') {
    return Response.json({ error: 'Falta archivo' }, { status: 400 });
  }
  const blob = file as Blob;

  // Validar tamaño (máx 10MB) y tipo
  if (blob.size > 10 * 1024 * 1024) {
    return Response.json({ error: 'Archivo muy grande (máx 10MB)' }, { status: 400 });
  }

  const mediaType = (blob.type || '').toLowerCase();
  const isImage = mediaType.startsWith('image/');
  const isPdf = mediaType === 'application/pdf';
  if (!isImage && !isPdf) {
    return Response.json({ error: 'Solo se aceptan imágenes (JPG/PNG/WebP) o PDF' }, { status: 400 });
  }

  // Convertir a base64 para Anthropic
  const buffer = Buffer.from(await blob.arrayBuffer());
  const base64 = buffer.toString('base64');

  const anthropic = getAnthropic();

  // Content block según tipo
  const contentBlock: Anthropic.Messages.ContentBlockParam = isImage
    ? {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
          data: base64,
        },
      }
    : {
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: base64,
        },
      };

  const prompt = `Estás analizando una factura de LUMA Energy (proveedor eléctrico de Puerto Rico) que un asesor de Windmar Home te acaba de pasar${additionalMessage ? '. El asesor también escribió: "' + additionalMessage + '"' : ''}.

INSTRUCCIONES CRÍTICAS:
1. Mira el bill y EXTRAE estos 4 datos exactos. Si alguno no se ve claramente en el documento, di "no visible".
2. Para la SUMA ANUAL de barras: las facturas de LUMA tienen un gráfico de barras con el consumo de los últimos 12 meses. Lee cada barra (en kWh) y suma todos los meses visibles. Si solo hay algunos meses visibles, suma los que SÍ se ven.
3. Devuelve EXACTAMENTE este formato:

📄 **Factura LUMA detectada**

- **Cuenta LUMA**: <número de cuenta del cliente, o "no visible">
- **Dirección**: <dirección del servicio que aparece en el bill, o "no visible">
- **Cobro de este mes**: $<monto total a pagar de este bill, o "no visible">
- **Consumo anual estimado**: <suma de todas las barras mensuales en kWh + nota de cuántos meses sumaste, o "no visible">

**Recomendación**:

Como el cliente SÍ tiene factura, usa [LUMA Scanner](https://luma-scanner-two.vercel.app/) con estos datos para dimensionar el sistema solar. Si el consumo es alto y el cliente quiere también optimizar aire acondicionado, complementa con [Calculadora Placas × Aires](https://calculadora-placas-aires-acondicion.vercel.app/).

Si quiere paquete completo (Roofing + Solar + Batería), tira el [Cotizador Proyecto Completo](https://proyecto-completo-three.vercel.app/) — tiene el mayor descuento.

REGLAS:
- Si el documento NO es una factura LUMA, responde: "Este documento no parece una factura LUMA. Necesito el bill del cliente para extraer cuenta, dirección, cobro del mes y consumo histórico."
- NO inventes valores. Si no se ve, di "no visible".
- NO calcules ahorros, payback ni proyectes precios — solo extrae lo que está en el documento.
- Si el asesor escribió un mensaje adicional (arriba), responde su pregunta específica DESPUÉS de extraer los 4 datos.
- Termina con un bloque <quick_replies> con 3 preguntas de seguimiento útiles para el asesor.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 700,
      messages: [
        {
          role: 'user',
          content: [contentBlock, { type: 'text', text: prompt }],
        },
      ],
    });

    // Extraer texto de la respuesta
    const textBlock = response.content.find((c) => c.type === 'text') as Anthropic.Messages.TextBlock | undefined;
    const fullText = textBlock?.text ?? 'No se pudo procesar el archivo.';

    // Persistir el mensaje del asistente en la conversación (si se mandó conv_id)
    if (conversationId) {
      const supabase = getSupabaseAdmin();
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_email', email)
        .single();
      if (conv) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: fullText,
          tool_refs: ['luma-scanner', 'calculadora-placas-ac', 'proyecto-completo'],
        });
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);
      }
    }

    console.log('[upload-luma]', {
      user: email,
      size_kb: Math.round(blob.size / 1024),
      type: mediaType,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    });

    return Response.json({ text: fullText });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error procesando archivo';
    console.error('[upload-luma] error:', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
