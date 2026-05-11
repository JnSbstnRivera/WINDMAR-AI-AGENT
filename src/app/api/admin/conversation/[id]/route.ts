import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';

/**
 * GET /api/admin/conversation/:id
 *
 * Devuelve todos los mensajes de una conversación específica.
 * SEGURIDAD: doble check de allowlist — solo admins pueden ver conversaciones
 * de otros asesores.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: 'No autenticado' }, { status: 401 });
  }
  if (!isAdmin(session.user.email)) {
    return Response.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id } = await params;
  if (!id || typeof id !== 'string') {
    return Response.json({ error: 'ID inválido' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc('admin_conversation_messages', {
    conv_id: id,
  });

  if (error) {
    console.error('[api/admin/conversation]', error);
    return Response.json({ error: 'No se pudo cargar' }, { status: 500 });
  }

  return Response.json({ messages: data ?? [] });
}
