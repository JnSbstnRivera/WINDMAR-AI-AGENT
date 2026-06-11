import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  searchLeads,
  getClientFull,
  detectQueryType,
  type ZohoLead,
  type ZohoClientFull,
} from '@/lib/zoho';
import {
  getViewerScope,
  ownsLead,
  filterOwnedLeads,
  NOT_IN_PORTFOLIO_MSG,
} from '@/lib/zoho-access';

export const runtime = 'nodejs';
export const maxDuration = 15;

/**
 * GET /api/zoho/search?q=...
 *
 * Endpoint inteligente:
 *  - Si q es email O Lead Number → busca UN cliente y devuelve datos completos
 *    (lead + deals + summary) listo para renderizar la card con coach.
 *  - Si q es teléfono O nombre → puede haber varios. Devuelve LISTA de leads
 *    para que el asesor elija cuál abrir.
 *
 * Respuestas:
 *   { mode: 'single',  client: ZohoClientFull }
 *   { mode: 'list',    leads: ZohoLead[] }
 *   { mode: 'none',    message: "No se encontró..." }
 *   { error: "..." }
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  if (!q || q.length < 3) {
    return NextResponse.json(
      { error: 'Query muy corta (mínimo 3 caracteres)' },
      { status: 400 }
    );
  }

  // Alcance del usuario: Asesor solo ve lo suyo; Líder/Admin ven todo.
  const scope = getViewerScope(session);

  try {
    const type = detectQueryType(q);
    // Email y Lead Number deberían dar siempre 1 resultado → full client
    if (type === 'email' || type === 'leadNumber') {
      const client = await getClientFull(q);
      if (!client) {
        return NextResponse.json({
          mode: 'none',
          message: `No se encontró ningún cliente con "${q}" en Zoho.`,
        });
      }
      // Scoping: si no es de su cartera, lo tratamos como "no encontrado para él".
      if (!ownsLead(client.lead, scope)) {
        return NextResponse.json({ mode: 'none', message: NOT_IN_PORTFOLIO_MSG });
      }
      return NextResponse.json({ mode: 'single', client });
    }

    // Teléfono o nombre → puede haber múltiples matches → lista
    const allLeads = await searchLeads(q, 10);
    const leads = filterOwnedLeads(allLeads, scope);
    if (leads.length === 0) {
      // Si había resultados pero ninguno es suyo, lo decimos claro.
      const msg =
        allLeads.length > 0 ? NOT_IN_PORTFOLIO_MSG : `No se encontró ningún cliente con "${q}" en Zoho.`;
      return NextResponse.json({ mode: 'none', message: msg });
    }

    // Si hay UN solo resultado (ya filtrado a lo suyo), lo trato como single — más útil
    if (leads.length === 1) {
      const client = await getClientFull(q);
      if (client && ownsLead(client.lead, scope)) {
        return NextResponse.json({ mode: 'single', client });
      }
    }

    return NextResponse.json({ mode: 'list', leads } satisfies {
      mode: 'list';
      leads: ZohoLead[];
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error consultando Zoho';
    console.error('[zoho/search]', msg);
    if (msg.includes('variables de entorno')) {
      return NextResponse.json(
        { error: 'Zoho no está configurado en este deploy. Contacta al admin.' },
        { status: 503 }
      );
    }
    if (msg.includes('invalid_code') || msg.includes('refresh')) {
      return NextResponse.json(
        {
          error: 'El refresh_token de Zoho es inválido o expiró. Genera uno nuevo en api-console.zoho.com',
          detail: msg,
        },
        { status: 401 }
      );
    }
    if (msg.includes('invalid_client')) {
      return NextResponse.json(
        {
          error: 'El Client ID/Secret de Zoho no coincide con el refresh_token.',
          detail: msg,
        },
        { status: 401 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

// Tipo helper exportado para los componentes que consumen este endpoint
export type ZohoSearchResponse =
  | { mode: 'single'; client: ZohoClientFull }
  | { mode: 'list'; leads: ZohoLead[] }
  | { mode: 'none'; message: string }
  | { error: string; detail?: string };
