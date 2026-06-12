import NextAuth from 'next-auth';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';
import { notifyAdminsNewAccess } from '@/lib/access-notify';

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

// Dominios corporativos del grupo Windmar autorizados para iniciar sesión.
// La env var ALLOWED_EMAIL_DOMAINS (coma-separada) SUMA dominios sin reemplazar
// los hardcoded — así nunca se pierde acceso si la env var se borra.
const HARDCODED_DOMAINS = ['windmarhome.com', 'windmarenergy.com'];

function getAllowedDomains(): Set<string> {
  const fromEnv = (process.env.ALLOWED_EMAIL_DOMAINS || '')
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
  return new Set([...HARDCODED_DOMAINS, ...fromEnv]);
}

/** ¿El correo pertenece a un dominio corporativo autorizado? */
export function isAllowedDomain(email: string | null | undefined): boolean {
  const domain = (email || '').toLowerCase().split('@')[1] || '';
  return !!domain && getAllowedDomains().has(domain);
}

/**
 * Convierte "Juan Sebastian Rivera Jiménez" → "Juan Rivera" (primer nombre + primer apellido).
 * Útil para firmas formales de correo aunque el display_name del asesor sea un apodo.
 *
 * Heurística para nombres hispanos:
 *   1 palabra:  "Juan"           → "Juan"
 *   2 palabras: "Juan Rivera"    → "Juan Rivera"
 *   3 palabras: "Juan A Rivera"  → "Juan A"  (no podemos saber si hay apellido materno)
 *   4+ palabras: "Juan Seb Rivera Jiménez" → "Juan Rivera" (primer nombre + apellido paterno)
 */
export function computeFormalName(fullName: string): string {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  if (parts.length === 0) return '';
  if (parts.length === 1) return cap(parts[0]);
  if (parts.length === 2) return `${cap(parts[0])} ${cap(parts[1])}`;
  if (parts.length === 3) return `${cap(parts[0])} ${cap(parts[1])}`;
  // 4+: nombre + apellido paterno (penúltima palabra)
  return `${cap(parts[0])} ${cap(parts[parts.length - 2])}`;
}

/**
 * Refresca el access_token de Microsoft Graph usando el refresh_token guardado.
 * Llamada al endpoint OAuth2 de Microsoft. Si falla (refresh_token revocado o
 * expirado a los 90 días), el siguiente intento de enviar correo falla con 401
 * y el asesor tendrá que volver a iniciar sesión.
 */
async function refreshMicrosoftToken(refreshToken: string) {
  const issuerRaw = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER || '';
  // Extraer tenant: acepta UUID o URL completa
  const tenant = issuerRaw.startsWith('http')
    ? issuerRaw.split('/').find((p) => p.length >= 30 && p.includes('-')) || 'common'
    : (issuerRaw || 'common');

  const params = new URLSearchParams({
    client_id: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
    client_secret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: 'openid profile email offline_access User.Read Mail.Send',
  });

  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Refresh failed ${res.status}: ${text.slice(0, 200)}`);
  }

  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
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
      // User.Read → /me/photo/$value (foto de perfil)
      // Mail.Send → enviar correos en nombre del asesor (feature de seguimiento)
      // offline_access → permite refresh_token para mantener Mail.Send vivo más de 1h
      authorization: { params: { scope: 'openid profile email offline_access User.Read Mail.Send' } },
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

      // Restricción de dominio — solo correos corporativos del grupo Windmar.
      // Se aceptan windmarhome.com y windmarenergy.com (empresa hermana).
      // Extensible sin tocar código vía env var ALLOWED_EMAIL_DOMAINS (coma-separados).
      if (!isAllowedDomain(email)) {
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

        // 1) Upsert idempotente del registro inicial (no sobrescribe si ya existe).
        //    - Usuario NUEVO normal  → status 'pending' (espera aprobación de un admin).
        //    - Usuario NUEVO admin   → status 'active' + is_superadmin (no se auto-bloquea).
        //    Con ignoreDuplicates:true, .select() devuelve fila SOLO si fue inserción nueva.
        const isAdminEmail = isAdmin(email);
        const { data: insertedRows } = await getSupabaseAdmin()
          .from('user_roles')
          .upsert(
            {
              user_email: email,
              display_name: capitalizedFirstName,
              rol: isAdminEmail ? 'Admin' : 'Asesor',
              assigned_by: 'auto',
              status: isAdminEmail ? 'active' : 'pending',
              is_superadmin: isAdminEmail,
            },
            { onConflict: 'user_email', ignoreDuplicates: true }
          )
          .select('user_email');

        // 2b) Si es un usuario NUEVO no-admin, avísale a los admins por correo.
        //     Best-effort con el token Graph del propio solicitante.
        const isNewPending =
          Array.isArray(insertedRows) && insertedRows.length > 0 && !isAdminEmail;
        if (isNewPending && accessToken) {
          await notifyAdminsNewAccess({
            accessToken,
            newUserEmail: email,
            displayName: capitalizedFirstName,
          });
        }

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
    async jwt({ token, trigger, session, account }) {
      // Persistir tokens de Microsoft Graph en el primer signIn.
      // Estos viajan en la cookie JWT encriptada (server-only) y se usan después
      // para llamar Graph API (Mail.Send) desde /api/email/send.
      if (account?.provider === 'microsoft-entra-id' && account.access_token) {
        token.msAccessToken = account.access_token;
        token.msRefreshToken = account.refresh_token;
        token.msExpiresAt = account.expires_at; // Unix timestamp en segundos
      }

      // Persistir nombre completo y formal del SSO de Microsoft.
      // Usado para firmas formales de correo (ej: "Juan Rivera" aunque el
      // display_name del onboarding sea "Juanse").
      if (token.email && (!token.formalName || trigger === 'signIn')) {
        const rawName = (token.name as string) || '';
        token.fullName = rawName;
        token.formalName = computeFormalName(rawName);
      }

      // Si el access token está expirado (o expira en menos de 60s), refrescamos.
      // Sin esto, después de 1h el feature de email dejaría de funcionar.
      if (token.msExpiresAt && typeof token.msExpiresAt === 'number' && token.msRefreshToken) {
        const nowSec = Math.floor(Date.now() / 1000);
        if (nowSec >= (token.msExpiresAt as number) - 60) {
          try {
            const refreshed = await refreshMicrosoftToken(token.msRefreshToken as string);
            token.msAccessToken = refreshed.access_token;
            if (refreshed.refresh_token) token.msRefreshToken = refreshed.refresh_token;
            token.msExpiresAt = Math.floor(Date.now() / 1000) + refreshed.expires_in;
          } catch (err) {
            console.error('[auth] Refresh de token Microsoft falló:', err);
            // No bloqueamos — el endpoint de email manejará el error 401 y pedirá re-login
          }
        }
      }

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
      if (trigger === 'signIn' || !token.userRole || token.status === undefined) {
        const email = (token.email || '').toLowerCase();
        if (email) {
          try {
            const { data } = await getSupabaseAdmin()
              .from('user_roles')
              .select('display_name, departamento, rol, onboarded_at, status, is_superadmin')
              .eq('user_email', email)
              .single();
            token.displayName = data?.display_name || null;
            token.departamento = data?.departamento || null;
            token.userRole = data?.rol || 'Asesor';
            token.onboardedAt = data?.onboarded_at || null;
            // status null/ausente → 'active' (no bloquear sesiones previas a la migración)
            token.status = data?.status || 'active';
            token.isSuperadmin = data?.is_superadmin === true;
          } catch {
            token.displayName = null;
            token.departamento = null;
            token.userRole = 'Asesor';
            token.onboardedAt = null;
            // Ante error transitorio de DB, NO bloqueamos al usuario.
            token.status = 'active';
            token.isSuperadmin = false;
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
        u.formalName = token.formalName ?? null;
        u.fullName = token.fullName ?? null;
        u.status = token.status ?? 'active';
        u.isSuperadmin = token.isSuperadmin === true;
      }
      // Exponer access token de Microsoft Graph al server (vía auth()).
      // Necesario para /api/email/send → Graph API.
      // Sí, /api/auth/session también lo devuelve al cliente — riesgo aceptado:
      // app interna @windmarhome.com, cookie httpOnly, scope mínimo (Mail.Send solo).
      const s = session as unknown as Record<string, unknown>;
      s.msAccessToken = token.msAccessToken ?? null;
      s.msExpiresAt = token.msExpiresAt ?? null;
      return session;
    },

    authorized({ auth }) {
      return !!auth?.user;
    },
  },
});
