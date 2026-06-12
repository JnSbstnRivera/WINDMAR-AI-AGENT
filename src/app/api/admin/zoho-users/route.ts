import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { canApproveAccess } from '@/lib/admin-auth';
import { getZohoUsers } from '@/lib/zoho';

export const runtime = 'nodejs';
export const maxDuration = 15;

/**
 * GET /api/admin/zoho-users
 * Lista de usuarios ACTIVOS de Zoho (id, nombre, correo) para el picker de
 * asignación — incluye usuarios que no usan la app (ej. developers/data
 * analysts que crean leads masivamente). Solo admins.
 */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!canApproveAccess(email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const users = await getZohoUsers();
    return NextResponse.json({ users });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error consultando Zoho';
    console.error('[admin/zoho-users]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
