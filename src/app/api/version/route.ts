import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/version — SHA del commit del deploy VIVO. El cliente lo compara con
 * el SHA horneado en su bundle (NEXT_PUBLIC_COMMIT_SHA) para detectar cuándo
 * hay una versión nueva y auto-actualizar el PWA (sin limpiar caché a mano).
 */
export async function GET() {
  return NextResponse.json(
    { sha: process.env.VERCEL_GIT_COMMIT_SHA || 'dev' },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
