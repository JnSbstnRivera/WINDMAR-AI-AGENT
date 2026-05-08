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

/**
 * Descarga la foto de perfil del usuario desde Microsoft Graph API.
 * Endpoint: GET https://graph.microsoft.com/v1.0/me/photo/$value
 * Devuelve un data URI base64 listo para usar en <img src> o NULL si el usuario
 * no tiene foto / falla la petición. Tamaño típico: 10-50KB.
 */
async function fetchMicrosoftPhoto(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      // 404 = usuario sin foto (caso normal); otros errores también caen al fallback
      return null;
    }
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (err) {
    console.warn('[auth] fetchMicrosoftPhoto falló:', err);
    return null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { maxAge: 28800 }, // 8 horas — auto-logout al final del turno
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: getIssuer(),
      // Pedimos User.Read explícitamente para acceder a /me/photo/$value
      authorization: { params: { scope: 'openid profile email User.Read' } },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    // Se ejecuta apenas Microsoft devuelve el usuario.
    // Restringe el acceso a @windmarhome.com, auto-provisiona el perfil y descarga la foto.
    async signIn({ user, account }) {
      const email = user.email?.trim().toLowerCase();
      if (!email) return false;

      // Restricción de dominio — solo correos corporativos
      if (!email.endsWith('@windmarhome.com')) {
        console.warn('[auth] Acceso rechazado por dominio:', email);
        return false;
      }

      try {
        // Por defecto extraemos solo el PRIMER NOMBRE de Microsoft.
        // Microsoft devuelve "Juan Sebastian Rivera Jiménez" → guardamos "Juan".
        // El asesor puede personalizarlo en el OnboardingModal o en el perfil.
        const fullName = user.name?.trim() || email.split('@')[0];
        const firstName = fullName.split(/\s+/)[0];
        const capitalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

        // Descargar foto de perfil de Microsoft Graph (best-effort).
        // Si falla o el usuario no tiene foto, photoUrl = null y se usa fallback (inicial).
        const accessToken = account?.access_token;
        const photoUrl = accessToken ? await fetchMicrosoftPhoto(accessToken) : null;

        // 1) Upsert idempotente del registro inicial (no sobrescribe display_name si ya existe)
        await getSupabaseAdmin()
          .from('user_roles')
          .upsert(
            {
              user_email: email,
              display_name: capitalizedFirstName,
              rol: 'Asesor',
              assigned_by: 'auto',
            },
            { onConflict: 'user_email', ignoreDuplicates: true }
          );

        // 2) Si tenemos foto, la actualizamos siempre (refresh en cada login).
        //    Esto se hace por separado para NO depender de ignoreDuplicates: true del upsert anterior.
        if (photoUrl) {
          await getSupabaseAdmin()
            .from('user_roles')
            .update({ photo_url: photoUrl })
            .eq('user_email', email);
        }
      } catch (err) {
        console.error('[auth] Auto-provision falló:', err);
        // No bloqueamos el login si Supabase falla — el JWT callback intentará de nuevo
      }
      return true;
    },

    // Enriquecer el JWT con display_name, departamento, rol y onboarded_at desde user_roles.
    // En 'update' aceptamos los datos del cliente directamente (más confiable que re-leer DB).
    async jwt({ token, trigger, session }) {
      // Caso 1: cliente llamó update({ displayName, departamento, rol, onboardedAt }) tras guardar perfil/onboarding
      if (trigger === 'update' && session && typeof session === 'object') {
        const s = session as Record<string, unknown>;
        if ('displayName' in s) token.displayName = (s.displayName as string | null) ?? null;
        if ('departamento' in s) token.departamento = (s.departamento as string | null) ?? null;
        if ('rol' in s) token.userRole = (s.rol as string | null) ?? 'Asesor';
        if ('onboardedAt' in s) token.onboardedAt = (s.onboardedAt as string | null) ?? null;
        return token;
      }

      // Caso 2: signIn inicial o token sin info → leer de user_roles
      // IMPORTANTE: NO guardamos photo_url en el JWT (la foto base64 es ~30KB y
      // hace que la cookie supere el límite de Vercel → REQUEST_HEADER_TOO_LARGE).
      // La foto se lee del servidor (page.tsx) directamente de Supabase.
      if (trigger === 'signIn' || !token.userRole) {
        const email = (token.email || '').toLowerCase();
        if (email) {
          try {
            const { data } = await getSupabaseAdmin()
              .from('user_roles')
              .select('display_name, departamento, rol, onboarded_at')
              .eq('user_email', email)
              .single();
            token.displayName = data?.display_name || null;
            token.departamento = data?.departamento || null;
            token.userRole = data?.rol || 'Asesor';
            token.onboardedAt = data?.onboarded_at || null;
          } catch {
            token.displayName = null;
            token.departamento = null;
            token.userRole = 'Asesor';
            token.onboardedAt = null;
          }
        }
      }
      return token;
    },

    // Exponer los datos en session.user para que el cliente los pueda leer.
    // photo_url NO se incluye aquí — se lee directamente del servidor en page.tsx.
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as unknown as Record<string, unknown>;
        u.displayName = token.displayName ?? null;
        u.departamento = token.departamento ?? null;
        u.rol = token.userRole ?? 'Asesor';
        u.onboardedAt = token.onboardedAt ?? null;
      }
      return session;
    },

    authorized({ auth }) {
      return !!auth?.user;
    },
  },
});
