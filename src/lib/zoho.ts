// ════════════════════════════════════════
// ZOHO CRM — helper compartido (server-side)
// ════════════════════════════════════════
// Permite que el agente consulte datos del cliente (leads, deals, consultor
// asignado) desde Zoho CRM para alimentar el "modo coach" — donde el bot
// sugiere qué ofrecer al cliente según su historial real.
//
// Auth: usamos UN SOLO refresh_token de servicio (Self Client de Zoho).
// El asesor NO necesita loguearse en Zoho — el agente consulta con su
// propia cuenta corporativa.
//
// Scopes requeridos (ya aprobados en VASS):
//   - ZohoCRM.modules.leads.READ
//   - ZohoCRM.modules.deals.READ
//   - ZohoCRM.users.READ

const ZOHO_ACCOUNTS = 'https://accounts.zoho.com';
const ZOHO_API = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';
const API_V2 = `${ZOHO_API}/crm/v2`;

// ORG ID corporativo Windmar — usado en URLs públicas de Zoho
export const ZOHO_ORG_ID = process.env.ZOHO_ORG_ID || '699641359';

// ─── Token de servicio cacheado en memoria del server ─────────────────
let svcToken: string | null = null;
let svcExp = 0;

/**
 * Obtiene un access_token válido para llamar a Zoho.
 * Usa cache de ~50min (tokens duran 1h, refrescamos antes con buffer).
 * Lanza error si faltan las variables de entorno.
 */
async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (svcToken && now < svcExp) return svcToken;

  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Faltan variables de entorno de Zoho. Necesitas ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET y ZOHO_REFRESH_TOKEN.'
    );
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const res = await fetch(`${ZOHO_ACCOUNTS}/oauth/v2/token`, {
    method: 'POST',
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Zoho rechazó el refresh (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    throw new Error('Respuesta de Zoho sin access_token');
  }

  svcToken = json.access_token;
  // expires_in viene en segundos. Cacheamos restando 5 min de buffer.
  svcExp = now + ((json.expires_in ?? 3600) - 300) * 1000;
  return svcToken;
}

// ─── Helper para fetch a Zoho con auth ───────────────────────────────
async function zohoFetch(path: string): Promise<unknown> {
  const token = await getAccessToken();
  const res = await fetch(`${API_V2}${path}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  if (res.status === 204) return { data: [] }; // sin resultados
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Zoho error ${res.status} en ${path}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// ═══════════════════════════════════════════════════════════════════
// TIPOS PÚBLICOS — lo que devolvemos al cliente / componentes
// ═══════════════════════════════════════════════════════════════════

export interface ZohoLead {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  stage: string | null;           // Hot/Warm/Cold/etc
  owner: string | null;           // consultor/owner asignado
  ownerEmail: string | null;
  systemPurchased: string | null; // qué tiene comprado (campo custom o de Deals)
  createdAt: string | null;
  zohoUrl: string;                // hipervínculo directo al lead en Zoho
}

export interface ZohoDeal {
  id: string;
  name: string;
  stage: string | null;           // Closed Won / Negotiation / etc.
  productName: string | null;     // producto cotizado
  owner: string | null;
  closingDate: string | null;
  createdAt: string | null;
  zohoUrl: string;                // hipervínculo directo al deal en Zoho
}

export interface ZohoClientFull {
  lead: ZohoLead;
  deals: ZohoDeal[];
  /** Resumen condensado generado server-side para el bot/coach */
  summary: {
    sistemaComprado: string;     // "Sistema Solar 8kW + Power Wall 3"
    consultor: string;            // nombre del consultor asignado
    totalDeals: number;
    dealsAbiertos: number;        // deals que no son Closed Won/Lost
    ultimaActividad: string | null;
  };
}

// ═══════════════════════════════════════════════════════════════════
// BÚSQUEDA DE LEADS
// ═══════════════════════════════════════════════════════════════════

/**
 * Normaliza un número de celular para búsqueda en Zoho.
 * "787-555-1234" → "7875551234"
 * "(787) 555 1234" → "7875551234"
 * Solo deja dígitos. Devuelve null si no parece teléfono válido.
 */
export function normalizePhone(input: string): string | null {
  const digits = (input || '').replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  return digits;
}

/** Detecta si una query es email, teléfono o nombre */
export function detectQueryType(query: string): 'email' | 'phone' | 'name' {
  const trimmed = query.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'email';
  if (normalizePhone(trimmed)) return 'phone';
  return 'name';
}

/**
 * Busca un lead por criterio (email | phone | name).
 * Devuelve el primer match (Zoho search ya ordena por relevancia).
 */
export async function searchLead(query: string): Promise<ZohoLead | null> {
  const type = detectQueryType(query);
  let criteria = '';

  if (type === 'email') {
    criteria = `(Email:equals:${encodeURIComponent(query)})`;
  } else if (type === 'phone') {
    const digits = normalizePhone(query) || '';
    // Zoho a veces guarda con guiones, a veces sin. Buscamos en Mobile Y Phone.
    criteria = `((Mobile:contains:${digits})or(Phone:contains:${digits}))`;
  } else {
    criteria = `(Last_Name:contains:${encodeURIComponent(query)})`;
  }

  const result = (await zohoFetch(`/Leads/search?criteria=${criteria}`)) as {
    data?: ZohoLeadRaw[];
  };

  if (!result.data || result.data.length === 0) return null;
  return mapLead(result.data[0]);
}

/**
 * Busca TODOS los leads que matcheen (hasta 10 resultados).
 * Útil para el panel lateral con búsqueda visual.
 */
export async function searchLeads(query: string, limit = 10): Promise<ZohoLead[]> {
  const type = detectQueryType(query);
  let criteria = '';

  if (type === 'email') {
    criteria = `(Email:equals:${encodeURIComponent(query)})`;
  } else if (type === 'phone') {
    const digits = normalizePhone(query) || '';
    criteria = `((Mobile:contains:${digits})or(Phone:contains:${digits}))`;
  } else {
    criteria = `(Last_Name:contains:${encodeURIComponent(query)})`;
  }

  const result = (await zohoFetch(`/Leads/search?criteria=${criteria}&per_page=${limit}`)) as {
    data?: ZohoLeadRaw[];
  };

  return (result.data || []).slice(0, limit).map(mapLead);
}

// ═══════════════════════════════════════════════════════════════════
// DEALS (cotizaciones / contratos del cliente)
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtiene los deals (contratos/cotizaciones) asociados a un lead.
 */
export async function getDealsByLead(leadId: string): Promise<ZohoDeal[]> {
  // En Zoho, los deals se relacionan via Lead_Id o Contact_Id.
  // Buscamos por Lead_Id (donde se guarda el lead original).
  const result = (await zohoFetch(
    `/Deals/search?criteria=(Lead_Id:equals:${leadId})&per_page=20`
  )) as { data?: ZohoDealRaw[] };

  return (result.data || []).map(mapDeal);
}

// ═══════════════════════════════════════════════════════════════════
// API DE ALTO NIVEL — lo que llama el endpoint /api/zoho/client
// ═══════════════════════════════════════════════════════════════════

/**
 * Trae TODO sobre un cliente en un solo call:
 *   lead + deals + resumen condensado
 * Devuelve null si no se encontró el cliente.
 */
export async function getClientFull(query: string): Promise<ZohoClientFull | null> {
  const lead = await searchLead(query);
  if (!lead) return null;

  const deals = await getDealsByLead(lead.id);

  // Construir resumen útil para el coach
  const dealsAbiertos = deals.filter(
    (d) => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost'
  ).length;
  const closedWon = deals.filter((d) => d.stage === 'Closed Won');
  const sistemaComprado =
    closedWon.length > 0
      ? closedWon.map((d) => d.productName || d.name).filter(Boolean).join(', ')
      : 'Sin compras cerradas';

  const ultimaActividad =
    deals.length > 0
      ? deals
          .map((d) => d.createdAt)
          .filter((d): d is string => !!d)
          .sort()
          .reverse()[0] || null
      : null;

  return {
    lead,
    deals,
    summary: {
      sistemaComprado: sistemaComprado || 'Sin información',
      consultor: lead.owner || 'Sin asignar',
      totalDeals: deals.length,
      dealsAbiertos,
      ultimaActividad,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// MAPPERS — convierten respuesta raw de Zoho a tipos públicos
// ═══════════════════════════════════════════════════════════════════

// Tipos "raw" — la respuesta de Zoho tiene MUCHAS campos, solo extraemos los útiles
interface ZohoLeadRaw {
  id: string;
  Full_Name?: string;
  First_Name?: string;
  Last_Name?: string;
  Email?: string;
  Phone?: string;
  Mobile?: string;
  Street?: string;
  City?: string;
  State?: string;
  Lead_Status?: string;
  Owner?: { name?: string; email?: string };
  Created_Time?: string;
  // Campos custom posibles:
  Sistema_Comprado?: string;
}

interface ZohoDealRaw {
  id: string;
  Deal_Name?: string;
  Stage?: string;
  Product_Name?: string;
  Owner?: { name?: string };
  Closing_Date?: string;
  Created_Time?: string;
}

function mapLead(raw: ZohoLeadRaw): ZohoLead {
  const fullName =
    raw.Full_Name ||
    [raw.First_Name, raw.Last_Name].filter(Boolean).join(' ').trim() ||
    'Sin nombre';
  const address = [raw.Street, raw.City, raw.State].filter(Boolean).join(', ') || null;

  return {
    id: raw.id,
    fullName,
    email: raw.Email || null,
    phone: raw.Phone || null,
    mobile: raw.Mobile || null,
    address,
    stage: raw.Lead_Status || null,
    owner: raw.Owner?.name || null,
    ownerEmail: raw.Owner?.email || null,
    systemPurchased: raw.Sistema_Comprado || null,
    createdAt: raw.Created_Time || null,
    zohoUrl: `https://crm.zoho.com/crm/org${ZOHO_ORG_ID}/tab/Leads/${raw.id}`,
  };
}

function mapDeal(raw: ZohoDealRaw): ZohoDeal {
  return {
    id: raw.id,
    name: raw.Deal_Name || 'Sin nombre',
    stage: raw.Stage || null,
    productName: raw.Product_Name || null,
    owner: raw.Owner?.name || null,
    closingDate: raw.Closing_Date || null,
    createdAt: raw.Created_Time || null,
    zohoUrl: `https://crm.zoho.com/crm/org${ZOHO_ORG_ID}/tab/Deals/${raw.id}`,
  };
}
