import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getClientFull } from '@/lib/zoho';

export const runtime = 'nodejs';
export const maxDuration = 15;

/**
 * GET /api/zoho/client?q=...
 * Busca un cliente en Zoho CRM por email, teléfono o nombre.
 * Devuelve datos del lead + sus deals + resumen.
 *
 * Solo accesible para usuarios autenticados con SSO Windmar.
 */
export async function GET(req: Request) {
  // 1) Verificar SSO
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // 2) Leer query
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  if (!q || q.length < 3) {
    return NextResponse.json(
      { error: 'Query muy corta (mínimo 3 caracteres)' },
      { status: 400 }
    );
  }

  // 3) Consultar Zoho
  try {
    const result = await getClientFull(q);
    if (!result) {
      return NextResponse.json(
        { found: false, message: `No se encontró ningún cliente con "${q}" en Zoho.` },
        { status: 200 }
      );
    }
    return NextResponse.json({ found: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error consultando Zoho';
    console.error('[zoho/client]', msg);
    // Distingue error de config vs error de red
    if (msg.includes('variables de entorno')) {
      return NextResponse.json(
        { error: 'Zoho no está configurado en este deploy. Contacta al admin.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
