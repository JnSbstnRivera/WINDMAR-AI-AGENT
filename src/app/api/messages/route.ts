import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// POST /api/messages — guarda un mensaje en una conversación
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: 'No autenticado' }, { status: 401 });
  }
  const email = session.user.email.toLowerCase();

  const { conversation_id, role, content } = await req.json() as {
    conversation_id: string;
    role: 'user' | 'assistant';
    content: string;
  };

  if (!conversation_id || !role || !content) {
    return Response.json({ error: 'Faltan campos' }, { status: 400 });
  }
  if (role !== 'user' && role !== 'assistant') {
    return Response.json({ error: 'Role inválido' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Verificar que la conversación pertenezca al asesor
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
    .from('messages')
    .insert({ conversation_id, role, content });

  if (insertError) {
    console.error('[api/messages POST]', insertError);
    return Response.json({ error: 'No se pudo guardar' }, { status: 500 });
  }

  // Actualizar updated_at de la conversación
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversation_id);

  return Response.json({ success: true });
}
