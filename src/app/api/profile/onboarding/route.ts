import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

const VALID_DEPARTAMENTOS = ['Telemercadeo', 'Ventas', 'Vass', 'Calidad'];
const VALID_ROLES = ['Asesor', 'Líder', 'Channel', 'Project M'];

/**
 * POST /api/profile/onboarding
 * Marca al asesor como "onboarded" y guarda nombre + departamento + rol.
 * Solo se llama UNA VEZ por asesor (la primera vez después del SSO).
 */
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

  // Validaciones
  if (!display_name || display_name.trim().length < 2 || display_name.trim().length > 30) {
    return Response.json({ error: 'Nombre debe tener entre 2 y 30 caracteres' }, { status: 400 });
  }
  if (!departamento || !VALID_DEPARTAMENTOS.includes(departamento)) {
    return Response.json({ error: 'Departamento inválido' }, { status: 400 });
  }
  if (!rol || !VALID_ROLES.includes(rol)) {
    return Response.json({ error: 'Rol inválido' }, { status: 400 });
  }

  const onboardedAt = new Date().toISOString();

  try {
    const { error } = await getSupabaseAdmin()
      .from('user_roles')
      .upsert(
        {
          user_email: email,
          display_name: display_name.trim(),
          departamento,
          rol,
          onboarded_at: onboardedAt,
          assigned_by: 'self',
        },
        { onConflict: 'user_email' }
      );

    if (error) {
      console.error('[api/profile/onboarding] Error:', error);
      return Response.json({ error: 'No se pudo guardar' }, { status: 500 });
    }

    return Response.json({ success: true, onboarded_at: onboardedAt });
  } catch (err) {
    console.error('[api/profile/onboarding] Exception:', err);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}
