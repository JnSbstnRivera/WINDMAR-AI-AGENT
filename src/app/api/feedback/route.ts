import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * POST /api/feedback
 * Guarda el feedback (👍/👎) del asesor sobre una respuesta del asistente.
 * Permite medir calidad real del SYSTEM_PROMPT y detectar fallos.
 *
 * Body:
 *   - conversation_id: UUID de la conversación
 *   - message_content: snapshot del texto del mensaje (para análisis posterior)
 *   - rating: 'up' | 'down'
 *   - reason?: razón opcional (sobre todo para downvotes)
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: 'No autenticado' }, { status: 401 });
  }
  const email = session.user.email.toLowerCase();

  let body: {
    conversation_id?: string;
    message_content?: string;
    rating?: 'up' | 'down';
    reason?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { conversation_id, message_content, rating, reason } = body;

  if (!conversation_id || !message_content || !rating) {
    return Response.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }
  if (rating !== 'up' && rating !== 'down') {
    return Response.json({ error: 'Rating inválido' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Verificar ownership de la conversación
  const { data: conv } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversation_id)
    .eq('user_email', email)
    .single();

  if (!conv) {
    return Response.json({ error: 'Conversación no encontrada' }, { status: 404 });
  }

  const { error: insertError } = await supabase
    .from('message_feedback')
    .insert({
      user_email: email,
      conversation_id,
      message_content: message_content.slice(0, 4000), // cap por seguridad
      rating,
      reason: reason?.slice(0, 500) ?? null,
    });

  if (insertError) {
    console.error('[api/feedback POST]', insertError);
    return Response.json({ error: 'No se pudo guardar' }, { status: 500 });
  }

  return Response.json({ success: true });
}
