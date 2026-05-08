import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// GET /api/conversations — lista todas las conversaciones del asesor con sus mensajes
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: 'No autenticado' }, { status: 401 });
  }
  const email = session.user.email.toLowerCase();

  const supabase = getSupabaseAdmin();

  const { data: convs, error } = await supabase
    .from('conversations')
    .select('id, title, created_at, updated_at')
    .eq('user_email', email)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[api/conversations GET]', error);
    return Response.json({ error: 'Error al cargar' }, { status: 500 });
  }

  if (!convs || convs.length === 0) {
    return Response.json({ conversations: [] });
  }

  // Cargar mensajes de cada conversación
  const ids = convs.map(c => c.id);
  const { data: msgs } = await supabase
    .from('messages')
    .select('id, conversation_id, role, content, created_at')
    .in('conversation_id', ids)
    .order('created_at', { ascending: true });

  const msgsByConv = new Map<string, Array<{ id: string; role: string; content: string; created_at: string }>>();
  for (const m of msgs ?? []) {
    const arr = msgsByConv.get(m.conversation_id as string) ?? [];
    arr.push({
      id: m.id as string,
      role: m.role as string,
      content: m.content as string,
      created_at: m.created_at as string,
    });
    msgsByConv.set(m.conversation_id as string, arr);
  }

  const full = convs.map(c => ({
    id: c.id,
    title: c.title,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    messages: (msgsByConv.get(c.id as string) ?? []).map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.created_at,
    })),
  }));

  return Response.json({ conversations: full });
}

// POST /api/conversations — crea una nueva conversación
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: 'No autenticado' }, { status: 401 });
  }
  const email = session.user.email.toLowerCase();

  const { title } = await req.json() as { title?: string };

  const { data, error } = await getSupabaseAdmin()
    .from('conversations')
    .insert({
      user_email: email,
      title: (title ?? 'Conversación').slice(0, 60),
    })
    .select('id, title, created_at, updated_at')
    .single();

  if (error || !data) {
    console.error('[api/conversations POST]', error);
    return Response.json({ error: 'No se pudo crear' }, { status: 500 });
  }

  return Response.json({
    conversation: {
      id: data.id,
      title: data.title,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      messages: [],
    },
  });
}

// DELETE /api/conversations — borra TODAS las conversaciones del asesor
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: 'No autenticado' }, { status: 401 });
  }
  const email = session.user.email.toLowerCase();

  const supabase = getSupabaseAdmin();

  // ON DELETE CASCADE en messages limpiará automáticamente
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('user_email', email);

  if (error) {
    console.error('[api/conversations DELETE]', error);
    return Response.json({ error: 'No se pudo borrar' }, { status: 500 });
  }

  return Response.json({ success: true });
}
