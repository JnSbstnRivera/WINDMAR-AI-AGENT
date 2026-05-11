import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// DELETE /api/conversations/:id — SOFT DELETE de una conversación específica.
// NO borra físicamente — marca deleted_at = NOW(). El asesor deja de verla,
// pero el admin la sigue auditando desde /admin con badge "Eliminada".
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: 'No autenticado' }, { status: 401 });
  }
  const email = session.user.email.toLowerCase();
  const { id } = await params;

  const { error } = await getSupabaseAdmin()
    .from('conversations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_email', email)
    .is('deleted_at', null);

  if (error) {
    console.error('[api/conversations/:id DELETE]', error);
    return Response.json({ error: 'No se pudo borrar' }, { status: 500 });
  }

  return Response.json({ success: true });
}
