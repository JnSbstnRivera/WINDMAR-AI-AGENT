import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * GET /api/conversations/search?q=...
 * Busca en las conversaciones del asesor (título + contenido de mensajes).
 * Devuelve hasta 10 matches con preview del primer match.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: 'No autenticado' }, { status: 401 });
  }
  const email = session.user.email.toLowerCase();

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  if (q.length < 2) {
    return Response.json({ results: [] });
  }

  const supabase = getSupabaseAdmin();
  const escaped = q.replace(/[%_]/g, (m) => `\\${m}`);
  const ilike = `%${escaped}%`;

  // 1. Conversaciones del asesor (no deleted)
  const { data: convs } = await supabase
    .from('conversations')
    .select('id, title, updated_at')
    .eq('user_email', email)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (!convs || convs.length === 0) {
    return Response.json({ results: [] });
  }
  const convIds = convs.map((c) => c.id);

  // 2. Buscar mensajes que matcheen
  const { data: msgs } = await supabase
    .from('messages')
    .select('conversation_id, role, content, created_at')
    .in('conversation_id', convIds)
    .ilike('content', ilike)
    .order('created_at', { ascending: false })
    .limit(40);

  // 3. Agrupar por conversación (primer match)
  const byConv = new Map<string, { content: string; created_at: string; role: string }>();
  for (const m of msgs ?? []) {
    if (!byConv.has(m.conversation_id as string)) {
      byConv.set(m.conversation_id as string, {
        content: m.content as string,
        created_at: m.created_at as string,
        role: m.role as string,
      });
    }
  }

  // 4. También considerar matches en el TÍTULO
  const titleMatches = convs.filter((c) => (c.title as string).toLowerCase().includes(q.toLowerCase()));

  // 5. Construir resultados
  const allConvIdsHit = new Set([...byConv.keys(), ...titleMatches.map((c) => c.id as string)]);
  const results = Array.from(allConvIdsHit).slice(0, 10).map((id) => {
    const conv = convs.find((c) => c.id === id)!;
    const hit = byConv.get(id);
    // Generar preview con el match resaltado
    let preview = hit?.content ?? conv.title;
    if (hit) {
      const lower = hit.content.toLowerCase();
      const idx = lower.indexOf(q.toLowerCase());
      if (idx >= 0) {
        const start = Math.max(0, idx - 30);
        const end = Math.min(hit.content.length, idx + q.length + 60);
        preview = (start > 0 ? '…' : '') + hit.content.slice(start, end) + (end < hit.content.length ? '…' : '');
      }
    }
    return {
      conversationId: id,
      title: conv.title,
      preview: preview.slice(0, 200),
      updatedAt: conv.updated_at,
      matchedRole: hit?.role,
    };
  });

  return Response.json({ results });
}
