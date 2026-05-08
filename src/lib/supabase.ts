import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let admin: SupabaseClient | null = null;

/**
 * Cliente de Supabase con service_role key — bypass de RLS.
 * Solo se usa en el servidor (api routes, server components, server actions).
 * NUNCA exportar este cliente al navegador.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!admin) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno');
    }
    admin = createClient(url, key, { auth: { persistSession: false } });
  }
  return admin;
}
