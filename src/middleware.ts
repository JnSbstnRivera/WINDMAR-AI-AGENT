import { auth, isAuthEnabled } from '@/auth';
import { NextResponse } from 'next/server';

export default isAuthEnabled()
  ? auth((req) => {
      const user = req.auth?.user as Record<string, unknown> | undefined;
      const { pathname } = req.nextUrl;

      // Sin sesión → login
      if (!user) {
        return NextResponse.redirect(new URL('/login', req.nextUrl));
      }

      // Compuerta de acceso: quien no esté 'active' (pending/rejected/suspended)
      // va a /pending. status ausente (sesión previa a la migración) = se trata
      // como activo para no bloquear a nadie por error.
      const status = user.status as string | undefined;
      const onPending = pathname === '/pending';
      if (status && status !== 'active') {
        if (!onPending) {
          return NextResponse.redirect(new URL('/pending', req.nextUrl));
        }
        return; // dejar ver la pantalla de espera
      }

      // Usuario activo no debe quedarse en la pantalla de espera
      if (onPending) {
        return NextResponse.redirect(new URL('/', req.nextUrl));
      }
    })
  : () => NextResponse.next();

export const config = {
  matcher: [
    // Proteger todo excepto: login, api/auth (NextAuth maneja eso solo), los archivos
    // públicos de la PWA (manifest + service worker) y assets estáticos.
    // El manifest y sw.js DEBEN ser accesibles sin auth o el navegador no ofrece instalar.
    // Excluimos cualquier path que termine en png/jpg/svg/ico/webp/gif para que favicons,
    // imágenes públicas y mascotas SUN BOT carguen sin auth.
    '/((?!login|api/auth|manifest.webmanifest|sw.js|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico|webp|gif)$).*)',
  ],
};
