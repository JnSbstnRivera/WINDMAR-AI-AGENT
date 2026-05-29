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
    console.error('[zoho] refresh fallo HTTP', res.status, text);
    throw new Error(`Zoho rechazó el refresh (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!json.access_token) {
    // Zoho devuelve 200 OK incluso con errores — el error está en el body.
    // Loguear TODO para diagnosticar (sin exponer las credenciales).
    console.error('[zoho] refresh sin access_token. Body:', JSON.stringify(json));
    const reason = json.error || 'unknown';
    const detail = json.error_description ? ` — ${json.error_description}` : '';
    throw new Error(`Zoho rechazó el refresh: ${reason}${detail}`);
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
  leadNumber: string | null;      // Lead # visible en Zoho (ej. "LD-000123")
  fullName: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  zipCode: string | null;
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
  productName: string | null;     // producto cotizado (Deal_Name suele tenerlo)
  amount: string | null;          // monto formateado "$12,500.00" o null
  contactName: string | null;     // cliente asociado (Contact_Name del Deal)
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

// Campos que pedimos a Zoho — minimizar payload (Zoho devuelve TODO si no
// especificas). Lista probada en NOTAS-VENTAS-VASS.
const LEAD_FIELDS =
  'Full_Name,First_Name,Last_Name,Phone,Mobile,Email,Lead_Status,Owner,Street,City,State,Zip_Code,Created_Time,Lead_Number';
const DEAL_FIELDS =
  'Deal_Name,Amount,Stage,Closing_Date,Contact_Name,Owner,Created_Time';

/**
 * Construye el path de búsqueda usando los parámetros NATIVOS de Zoho.
 * Mucho más rápido y robusto que el modo "criteria" — ya probado en VASS.
 *
 *   email  → ?email=jose@correo.com    (búsqueda exacta)
 *   phone  → ?phone=7875551234         (solo dígitos, contains)
 *   name   → ?word=Maria               (full-text search)
 */
function buildSearchPath(module: 'Leads' | 'Deals', query: string, limit: number): string {
  const fields = module === 'Leads' ? LEAD_FIELDS : DEAL_FIELDS;
  const digits = (query || '').replace(/\D/g, '');

  if (query.includes('@')) {
    return `/${module}/search?email=${encodeURIComponent(query)}&fields=${fields}&per_page=${limit}`;
  }
  if (digits.length >= 7) {
    return `/${module}/search?phone=${encodeURIComponent(digits)}&fields=${fields}&per_page=${limit}`;
  }
  return `/${module}/search?word=${encodeURIComponent(query)}&fields=${fields}&per_page=${limit}`;
}

/**
 * Busca un lead por criterio (email | phone | name).
 * Devuelve el primer match (Zoho search ya ordena por relevancia).
 */
export async function searchLead(query: string): Promise<ZohoLead | null> {
  const result = (await zohoFetch(buildSearchPath('Leads', query, 10))) as {
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
  const result = (await zohoFetch(buildSearchPath('Leads', query, limit))) as {
    data?: ZohoLeadRaw[];
  };

  return (result.data || []).map(mapLead);
}

// ═══════════════════════════════════════════════════════════════════
// DEALS (cotizaciones / contratos del cliente)
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtiene los deals (contratos/cotizaciones) asociados a un lead.
 *
 * En Zoho los deals NO siempre tienen Lead_Id (cuando el lead se convierte
 * a contacto, queda asociado vía Contact_Name). La estrategia más robusta
 * es buscar por la MISMA query del lead (email/teléfono/nombre) usando los
 * parámetros nativos de Zoho, igual que hace NOTAS-VENTAS-VASS.
 */
export async function getDealsByQuery(query: string): Promise<ZohoDeal[]> {
  try {
    const result = (await zohoFetch(buildSearchPath('Deals', query, 20))) as {
      data?: ZohoDealRaw[];
    };
    return (result.data || []).map(mapDeal);
  } catch {
    // Si la búsqueda de deals falla (sin permisos / sin matches), devolvemos vacío
    return [];
  }
}

/** Alias de compatibilidad — algunos lugares aún la llamaban así */
export async function getDealsByLead(_leadId: string, query?: string): Promise<ZohoDeal[]> {
  if (!query) return [];
  return getDealsByQuery(query);
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
  // Buscamos lead y deals EN PARALELO con la misma query — más rápido.
  // Los deals se asocian al cliente final (Contact), no al lead original,
  // por eso buscamos con la misma query (email/teléfono/nombre).
  const [lead, deals] = await Promise.all([searchLead(query), getDealsByQuery(query)]);
  if (!lead) return null;

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

// Tipos "raw" — la respuesta de Zoho tiene MUCHOS campos, solo extraemos los útiles
interface ZohoLeadRaw {
  id: string;
  Lead_Number?: string;
  Full_Name?: string;
  First_Name?: string;
  Last_Name?: string;
  Email?: string;
  Phone?: string;
  Mobile?: string;
  Street?: string;
  City?: string;
  State?: string;
  Zip_Code?: string;
  Lead_Status?: string;
  Owner?: { name?: string; email?: string };
  Created_Time?: string;
  // Campos custom posibles:
  Sistema_Comprado?: string;
}

interface ZohoDealRaw {
  id: string;
  Deal_Name?: string;
  Amount?: number | string;
  Stage?: string;
  Contact_Name?: { name?: string };
  Owner?: { name?: string };
  Closing_Date?: string;
  Created_Time?: string;
}

function mapLead(raw: ZohoLeadRaw): ZohoLead {
  const fullName =
    raw.Full_Name ||
    [raw.First_Name, raw.Last_Name].filter(Boolean).join(' ').trim() ||
    'Sin nombre';
  const address =
    [raw.Street, raw.City, raw.State, raw.Zip_Code].filter(Boolean).join(', ') || null;

  return {
    id: raw.id,
    leadNumber: raw.Lead_Number || null,
    fullName,
    email: raw.Email || null,
    phone: raw.Phone || null,
    mobile: raw.Mobile || null,
    address,
    zipCode: raw.Zip_Code || null,
    stage: raw.Lead_Status || null,
    owner: raw.Owner?.name || null,
    ownerEmail: raw.Owner?.email || null,
    systemPurchased: raw.Sistema_Comprado || null,
    createdAt: raw.Created_Time || null,
    zohoUrl: `https://crm.zoho.com/crm/org${ZOHO_ORG_ID}/tab/Leads/${raw.id}`,
  };
}

function mapDeal(raw: ZohoDealRaw): ZohoDeal {
  // Amount viene como número en Zoho — lo formateamos con $ y miles
  const amount =
    typeof raw.Amount === 'number'
      ? `$${raw.Amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : raw.Amount
      ? String(raw.Amount)
      : null;

  return {
    id: raw.id,
    name: raw.Deal_Name || 'Sin nombre',
    stage: raw.Stage || null,
    productName: raw.Deal_Name || null, // En Zoho el "producto" suele estar en el nombre del deal
    amount,
    contactName: raw.Contact_Name?.name || null,
    owner: raw.Owner?.name || null,
    closingDate: raw.Closing_Date || null,
    createdAt: raw.Created_Time || null,
    zohoUrl: `https://crm.zoho.com/crm/org${ZOHO_ORG_ID}/tab/Deals/${raw.id}`,
  };
}
