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
 * POST /api/upload-document
 * Análisis flexible de CUALQUIER documento (foto o PDF) que el asesor pase.
 *
 * Comportamiento dependiente del mensaje del asesor:
 *  - Si el asesor escribió mensaje específico (ej. "dame los datos de este
 *    documento", "¿quién es el titular?", "extrae el monto") → el bot
 *    cumple su pedido sobre el documento.
 *  - Si NO escribió mensaje → el bot detecta el tipo y extrae lo más
 *    relevante automáticamente. Para facturas LUMA mantiene el formato
 *    estructurado de extracción (cuenta, dirección, cobro, consumo anual).
 *
 * Privacidad: el archivo NO se guarda — solo pasa por memoria del request
 * hacia Anthropic y se descarta.
 *
 * Formatos: JPG, PNG, WebP, GIF, PDF · máx 10MB.
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

  if (blob.size > 10 * 1024 * 1024) {
    return Response.json({ error: 'Archivo muy grande (máx 10MB)' }, { status: 400 });
  }

  const mediaType = (blob.type || '').toLowerCase();
  const isImage = mediaType.startsWith('image/');
  const isPdf = mediaType === 'application/pdf';
  if (!isImage && !isPdf) {
    return Response.json(
      { error: 'Solo se aceptan imágenes (JPG/PNG/WebP/GIF) o PDF' },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const base64 = buffer.toString('base64');

  const anthropic = getAnthropic();

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

  // ════════════════════════════════════════
  // PROMPT — flexible según haya mensaje del asesor o no
  // ════════════════════════════════════════
  // Si el asesor escribió mensaje → cumple su pedido.
  // Si no → análisis automático con detección de tipo de documento.
  // Para facturas LUMA conserva el formato estructurado por compatibilidad.
  const prompt = additionalMessage
    ? `Eres el copiloto IA de Windmar Home Puerto Rico. Un asesor te acaba de pasar un documento (foto o PDF) y te escribió específicamente:

"${additionalMessage}"

Tu trabajo: analizar el documento y CUMPLIR el pedido del asesor con precisión. Sé útil y conciso.

REGLAS GENERALES:
- NUNCA inventes datos. Si algo no se ve claro en el documento, di "no se ve claramente" o "no visible".
- NUNCA menciones precios concretos de productos Windmar, mensualidades ni ahorros estimados (regla suprema del negocio). Si el asesor pregunta por precios, recuérdale que use los cotizadores oficiales.
- Si extraes números, fechas o direcciones, sé exacto al máximo.
- Si el documento NO contiene la información que el asesor pide, dilo claro y honesto.
- Usa **negritas** para destacar los datos importantes que extraigas.
- Si el documento es una FACTURA LUMA Y el asesor está pidiendo análisis de consumo, recomienda al final usar [LUMA Scanner](https://luma-scanner-two.vercel.app/) para dimensionar el sistema.

Termina con un bloque <quick_replies> de 3 sugerencias útiles para el asesor (preguntas o acciones de seguimiento naturales).`
    : `Eres el copiloto IA de Windmar Home Puerto Rico. Un asesor te acaba de pasar un documento (foto o PDF) SIN texto adicional.

Tu trabajo: identificar qué tipo de documento es y extraer los datos más útiles para un asesor de call center.

PASO 1 — IDENTIFICA EL TIPO:
- Factura LUMA Energy (eléctrica de PR)
- Factura de otro servicio (agua, gas, internet)
- Identificación con foto (driver's license, ID, pasaporte)
- Cotización / propuesta
- Contrato firmado
- Estudio técnico / planos
- Otro (descríbelo brevemente)

PASO 2 — EXTRAE LOS DATOS RELEVANTES SEGÚN EL TIPO:

▸ Si es **FACTURA LUMA**: usa este formato EXACTO:

📄 **Factura LUMA detectada**

- **Cuenta LUMA**: <número de cuenta, o "no visible">
- **Dirección**: <dirección del servicio, o "no visible">
- **Cobro de este mes**: $<monto total, o "no visible">
- **Consumo anual estimado**: <suma de TODAS las barras mensuales visibles en el gráfico de 12 meses + nota de cuántos meses sumaste, o "no visible">

**Recomendación**: Como el cliente SÍ tiene factura, usa [LUMA Scanner](https://luma-scanner-two.vercel.app/) con estos datos para dimensionar el sistema solar. Si el consumo es alto y el cliente quiere optimizar aire acondicionado, complementa con [Calculadora Placas × Aires](https://calculadora-placas-aires-acondicion.vercel.app/). Si quiere paquete completo (Roofing + Solar + Batería), tira el [Cotizador Proyecto Completo](https://proyecto-completo-three.vercel.app/).

▸ Si es **IDENTIFICACIÓN**: extrae nombre completo, fecha de nacimiento, número (parcial: solo últimos 4 dígitos), dirección si aparece, fecha de expiración.

▸ Si es **COTIZACIÓN o CONTRATO**: extrae cliente, fecha, productos/servicios listados (sin tocar montos si el documento los muestra — solo menciona "incluye precios" sin repetirlos), responsable Windmar si aparece.

▸ Si es **OTRO DOCUMENTO**: ofrece un resumen estructurado de los datos clave visibles. Pregunta al asesor qué necesita extraer específicamente.

REGLAS GENERALES:
- NUNCA inventes datos. "No visible" cuando algo no está claro.
- NUNCA menciones precios concretos de productos Windmar ni proyecciones de ahorro (regla suprema).
- Para IDs, NO expongas el número completo por privacidad — solo los últimos 4 dígitos.
- Usa **negritas** para los datos importantes.

Termina con un bloque <quick_replies> con 3 sugerencias útiles según el tipo de documento (ej. para LUMA: "Calcular ahorro estimado", "¿Qué sistema le recomiendo?"; para ID: "Verificar elegibilidad de financiamiento"; etc.).`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 900,
      messages: [
        {
          role: 'user',
          content: [contentBlock, { type: 'text', text: prompt }],
        },
      ],
    });

    const textBlock = response.content.find((c) => c.type === 'text') as
      | Anthropic.Messages.TextBlock
      | undefined;
    const fullText = textBlock?.text ?? 'No se pudo procesar el archivo.';

    // Detecta si la respuesta menciona LUMA Scanner para guardar tool_refs apropiados
    const mentionsLumaScanner = /luma-scanner|LUMA Scanner/i.test(fullText);
    const toolRefs: string[] = [];
    if (mentionsLumaScanner) toolRefs.push('luma-scanner');
    if (/calculadora-placas-aires|Placas.*Aires/i.test(fullText)) toolRefs.push('calculadora-placas-ac');
    if (/proyecto-completo|Proyecto Completo/i.test(fullText)) toolRefs.push('proyecto-completo');

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
          tool_refs: toolRefs.length > 0 ? toolRefs : null,
        });
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);
      }
    }

    console.log('[upload-document]', {
      user: email,
      size_kb: Math.round(blob.size / 1024),
      type: mediaType,
      has_message: !!additionalMessage,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    });

    return Response.json({ text: fullText });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error procesando archivo';
    console.error('[upload-document] error:', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
