import { auth, isAuthEnabled } from '@/auth';
import { NextResponse } from 'next/server';

export default isAuthEnabled()
  ? auth((req) => {
      // Si el usuario no tiene sesión, lo mandamos a /login
      if (!req.auth?.user) {
        return NextResponse.redirect(new URL('/login', req.nextUrl));
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
