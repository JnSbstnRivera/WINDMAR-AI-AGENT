import NextAuth from 'next-auth';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import { getSupabaseAdmin } from '@/lib/supabase';

// Acepta el issuer como URL completa O como tenant ID solo.
function getIssuer() {
  const value = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER || '';
  if (value.startsWith('http')) return value;
  if (value) return `https://login.microsoftonline.com/${value}/v2.0`;
  return undefined;
}

export function isAuthEnabled() {
  return !!(
    process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
    process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { maxAge: 28800 }, // 8 horas — auto-logout al final del turno
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: getIssuer(),
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    // Se ejecuta apenas Microsoft devuelve el usuario.
    // Restringe el acceso a @windmarhome.com y auto-provisiona el perfil en Supabase.
    async signIn({ user }) {
      const email = user.email?.trim().toLowerCase();
      if (!email) return false;

      // Restricción de dominio — solo correos corporativos
      if (!email.endsWith('@windmarhome.com')) {
        console.warn('[auth] Acceso rechazado por dominio:', email);
        return false;
      }

      try {
        await getSupabaseAdmin()
          .from('user_roles')
          .upsert(
            {
              user_email: email,
              display_name: user.name?.trim() || email.split('@')[0],
              rol: 'Asesor',
              assigned_by: 'auto',
            },
            { onConflict: 'user_email', ignoreDuplicates: true }
          );
      } catch (err) {
        console.error('[auth] Auto-provision falló:', err);
        // No bloqueamos el login si Supabase falla — el JWT callback intentará de nuevo
      }
      return true;
    },

    // Enriquecer el JWT con display_name, departamento y rol desde user_roles.
    // En 'update' aceptamos los datos del cliente directamente (más confiable que re-leer DB).
    async jwt({ token, trigger, session }) {
      // Caso 1: cliente llamó update({ displayName, departamento, rol }) tras guardar perfil.
      if (trigger === 'update' && session && typeof session === 'object') {
        const s = session as Record<string, unknown>;
        if ('displayName' in s) token.displayName = (s.displayName as string | null) ?? null;
        if ('departamento' in s) token.departamento = (s.departamento as string | null) ?? null;
        if ('rol' in s) token.userRole = (s.rol as string | null) ?? 'Asesor';
        return token;
      }

      // Caso 2: signIn inicial o token sin info → leer de user_roles
      if (trigger === 'signIn' || !token.userRole) {
        const email = (token.email || '').toLowerCase();
        if (email) {
          try {
            const { data } = await getSupabaseAdmin()
              .from('user_roles')
              .select('display_name, departamento, rol')
              .eq('user_email', email)
              .single();
            token.displayName = data?.display_name || null;
            token.departamento = data?.departamento || null;
            token.userRole = data?.rol || 'Asesor';
          } catch {
            token.displayName = null;
            token.departamento = null;
            token.userRole = 'Asesor';
          }
        }
      }
      return token;
    },

    // Exponer los datos en session.user para que el cliente los pueda leer.
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as Record<string, unknown>).displayName = token.displayName ?? null;
        (session.user as unknown as Record<string, unknown>).departamento = token.departamento ?? null;
        (session.user as unknown as Record<string, unknown>).rol = token.userRole ?? 'Asesor';
      }
      return session;
    },

    authorized({ auth }) {
      return !!auth?.user;
    },
  },
});
