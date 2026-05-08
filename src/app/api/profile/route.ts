import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

const VALID_DEPARTAMENTOS = ['Telemercadeo', 'Ventas', 'Vass', 'Calidad'];
const VALID_ROLES = ['Asesor', 'Líder', 'Channel', 'Project M'];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: 'No autenticado' }, { status: 401 });
  }
  const email = session.user.email.toLowerCase();

  let body: { display_name?: string; departamento?: string; rol?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { display_name, departamento, rol } = body;

  // Validaciones básicas
  if (!display_name || display_name.trim().length < 2 || display_name.trim().length > 30) {
    return Response.json({ error: 'Nombre inválido' }, { status: 400 });
  }
  if (departamento && !VALID_DEPARTAMENTOS.includes(departamento)) {
    return Response.json({ error: 'Departamento inválido' }, { status: 400 });
  }
  if (rol && !VALID_ROLES.includes(rol)) {
    return Response.json({ error: 'Rol inválido' }, { status: 400 });
  }

  try {
    const { error } = await getSupabaseAdmin()
      .from('user_roles')
      .upsert(
        {
          user_email: email,
          display_name: display_name.trim(),
          departamento: departamento || null,
          rol: rol || 'Asesor',
        },
        { onConflict: 'user_email' }
      );

    if (error) {
      console.error('[api/profile] Error:', error);
      return Response.json({ error: 'No se pudo guardar' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('[api/profile] Exception:', err);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}
