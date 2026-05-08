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
    // Proteger todo excepto: login, api/auth (NextAuth maneja eso solo), assets estáticos
    '/((?!login|api/auth|_next/static|_next/image|favicon\\.ico|sunbot.*\\.png|logo-inicial-chat\\.png).*)',
  ],
};
