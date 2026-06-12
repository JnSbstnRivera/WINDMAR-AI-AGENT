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

import { bucketOf, type Bucket } from '@/lib/zoho-status';

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

// ─── Helper para fetch a Zoho con auth + TIMEOUT ───────────────────
// Timeout de 10s para no hacer hang del chat completo si Zoho responde lento.
async function zohoFetch(path: string, timeoutMs = 10_000): Promise<unknown> {
  const token = await getAccessToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_V2}${path}`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
      signal: controller.signal,
    });
    if (res.status === 204) return { data: [] }; // sin resultados
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Zoho error ${res.status} en ${path}: ${text.slice(0, 200)}`);
    }
    return res.json();
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Zoho timeout (${timeoutMs / 1000}s) en ${path}`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
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
  owner: string | null;           // Lead Owner (agente del call center que registró el lead)
  ownerEmail: string | null;
  consultor: string | null;       // Sales_Rep — el consultor de ventas asignado (NO el owner)
  consultorEmail: string | null;
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

/** Detecta si una query es email, teléfono, Lead# o nombre */
export type QueryType = 'email' | 'phone' | 'leadNumber' | 'name';

export function detectQueryType(query: string): QueryType {
  const trimmed = query.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'email';
  // Lead numbers en la org de PR: L792795 (también LD-XXXXXX / LE-XXXXXX)
  if (/^L[DE]?[-_]?\d+$/i.test(trimmed)) return 'leadNumber';
  if (normalizePhone(trimmed)) return 'phone';
  return 'name';
}

// Campos que pedimos a Zoho — minimizar payload (Zoho devuelve TODO si no
// especificas). Lista probada en NOTAS-VENTAS-VASS.
const LEAD_FIELDS =
  'Full_Name,First_Name,Last_Name,Phone,Mobile,Email,Lead_Status,Owner,Sales_Rep,Sales_Rep_Email,Street,City,State,Zip_Code,Created_Time,Lead_Number';
const DEAL_FIELDS =
  'Deal_Name,Amount,Stage,Closing_Date,Contact_Name,Owner,Created_Time';

/**
 * Construye el path de búsqueda usando los parámetros NATIVOS de Zoho.
 * Mucho más rápido y robusto que el modo "criteria" — ya probado en VASS.
 *
 *   email       → ?email=jose@correo.com      (exacta)
 *   phone       → ?phone=7875551234           (solo dígitos, contains)
 *   leadNumber  → ?criteria=(Lead_Number:equals:LD-000123) (exacta)
 *   name        → ?word=Maria                 (full-text)
 */
function buildSearchPath(module: 'Leads' | 'Deals', query: string, limit: number): string {
  const fields = module === 'Leads' ? LEAD_FIELDS : DEAL_FIELDS;
  const type = detectQueryType(query);
  const digits = (query || '').replace(/\D/g, '');

  if (type === 'email') {
    return `/${module}/search?email=${encodeURIComponent(query)}&fields=${fields}&per_page=${limit}`;
  }
  if (type === 'leadNumber' && module === 'Leads') {
    // Lead Number es campo exacto en Zoho — usa criteria con :equals:
    return `/${module}/search?criteria=(Lead_Number:equals:${encodeURIComponent(query)})&fields=${fields}&per_page=${limit}`;
  }
  if (type === 'phone' || digits.length >= 7) {
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
      consultor: lead.consultor || 'Sin asignar',
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
  Sales_Rep?: { name?: string; email?: string };
  Sales_Rep_Email?: string;
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
    consultor: raw.Sales_Rep?.name || null,
    consultorEmail: raw.Sales_Rep?.email || raw.Sales_Rep_Email || null,
    systemPurchased: raw.Sistema_Comprado || null,
    createdAt: raw.Created_Time || null,
    zohoUrl: `https://crm.zoho.com/crm/org${ZOHO_ORG_ID}/tab/Leads/${raw.id}`,
  };
}

// ═══════════════════════════════════════════════════════════════════
// FASE 3 — "Mis leads", última nota, triage
// ═══════════════════════════════════════════════════════════════════

/** POST a Zoho (para COQL). Mismo manejo de auth/timeout que zohoFetch. */
async function zohoPost(path: string, body: unknown, timeoutMs = 10_000): Promise<unknown> {
  const token = await getAccessToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_V2}${path}`, {
      method: 'POST',
      headers: { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (res.status === 204) return { data: [] };
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Zoho error ${res.status} en ${path}: ${text.slice(0, 200)}`);
    }
    return res.json();
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Zoho timeout (${timeoutMs / 1000}s) en ${path}`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Cache de usuarios de Zoho (email → id + lista completa) ──────────
// Los IDs de Owner deben ser numéricos, no el correo. Resolvemos una vez
// por proceso y cacheamos en memoria.
export interface ZohoUser {
  id: string;
  name: string;
  email: string;
}

let usersCache: Map<string, string> | null = null;
let usersListCache: ZohoUser[] | null = null;

async function loadUsers(): Promise<Map<string, string>> {
  if (usersCache) return usersCache;
  const map = new Map<string, string>();
  const list: ZohoUser[] = [];
  let page = 1;
  // Hasta 4 páginas de 200 = 800 usuarios (de sobra para Windmar PR).
  for (; page <= 4; page++) {
    const res = (await zohoFetch(`/users?type=ActiveUsers&per_page=200&page=${page}`)) as {
      users?: Array<{ id: string; email?: string; full_name?: string }>;
      info?: { more_records?: boolean };
    };
    for (const u of res.users || []) {
      if (u.email) {
        map.set(u.email.toLowerCase(), u.id);
        list.push({ id: u.id, name: u.full_name || u.email, email: u.email.toLowerCase() });
      }
    }
    if (!res.info?.more_records) break;
  }
  usersCache = map;
  usersListCache = list.sort((a, b) => a.name.localeCompare(b.name));
  return map;
}

/** Resuelve el Owner ID de Zoho a partir del correo del asesor. */
export async function getZohoUserIdByEmail(email: string): Promise<string | null> {
  const map = await loadUsers();
  return map.get(email.trim().toLowerCase()) || null;
}

/** Lista completa de usuarios activos de Zoho (para pickers/datalists). */
export async function getZohoUsers(): Promise<ZohoUser[]> {
  await loadUsers();
  return usersListCache || [];
}

export interface MyLead {
  id: string;
  leadNumber: string | null;  // Lead # visible en Zoho (formato PR: L792795)
  fullName: string;
  email: string | null;
  phone: string | null;
  status: string | null;
  bucket: Bucket;
  owner: string | null;       // Lead Owner (agente call center)
  consultor: string | null;   // Sales_Rep (consultor de ventas)
  modifiedAt: string | null;
  createdAt: string | null;
  zohoUrl: string;
  lastNote?: { content: string; createdAt: string | null } | null;
  /** true si está en bucket accionable y sin nota en las últimas 24h. */
  needsFollowUp?: boolean;
}

/**
 * Trae los leads de un asesor (por Owner ID), ordenados por última actividad.
 * Usa /Leads/search?criteria=(Owner:equals:id) — a diferencia de COQL, devuelve
 * los lookups completos (Owner y Sales_Rep con nombre), verificado contra la
 * org de PR. Orden client-side por Modified_Time (search no soporta sort).
 */
export async function getMyLeads(ownerId: string, limit = 200): Promise<MyLead[]> {
  const fields = `${LEAD_FIELDS},Modified_Time`;
  const res = (await zohoFetch(
    `/Leads/search?criteria=(Owner:equals:${ownerId})&fields=${fields}&per_page=${Math.min(limit, 200)}`
  )) as { data?: (ZohoLeadRaw & { Modified_Time?: string })[] };

  const rows = res.data || [];
  rows.sort((a, b) => (b.Modified_Time || '').localeCompare(a.Modified_Time || ''));

  return rows.map((r) => ({
    id: r.id,
    leadNumber: r.Lead_Number || null,
    fullName: r.Full_Name || [r.First_Name, r.Last_Name].filter(Boolean).join(' ').trim() || 'Sin nombre',
    email: r.Email || null,
    phone: r.Mobile || r.Phone || null,
    status: r.Lead_Status || null,
    bucket: bucketOf(r.Lead_Status),
    owner: r.Owner?.name || null,
    consultor: r.Sales_Rep?.name || null,
    modifiedAt: r.Modified_Time || null,
    createdAt: r.Created_Time || null,
    zohoUrl: `https://crm.zoho.com/crm/org${ZOHO_ORG_ID}/tab/Leads/${r.id}`,
  }));
}

// ── ESCRITURA (Fase 4) — solo la usan endpoints gateados a Líder/Admin ──

/** PUT a Zoho (update de registros). */
async function zohoPut(path: string, body: unknown, timeoutMs = 15_000): Promise<unknown> {
  const token = await getAccessToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_V2}${path}`, {
      method: 'PUT',
      headers: { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Zoho error ${res.status} en ${path}: ${text.slice(0, 200)}`);
    }
    return res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface AssignResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ id: string; reason: string }>;
}

/**
 * Asigna/reasigna el Owner de uno o varios leads (asignación masiva).
 * Procesa en lotes de 100 (límite de Zoho). Tolera errores por registro.
 */
export async function assignLeads(leadIds: string[], newOwnerId: string): Promise<AssignResult> {
  const result: AssignResult = { total: leadIds.length, success: 0, failed: 0, errors: [] };

  for (let i = 0; i < leadIds.length; i += 100) {
    const batch = leadIds.slice(i, i + 100);
    const body = { data: batch.map((id) => ({ id, Owner: { id: newOwnerId } })) };
    try {
      const res = (await zohoPut('/Leads', body)) as {
        data?: Array<{ code?: string; status?: string; details?: { id?: string }; message?: string }>;
      };
      for (const r of res.data || []) {
        if (r.code === 'SUCCESS' || r.status === 'success') result.success++;
        else {
          result.failed++;
          result.errors.push({ id: r.details?.id || '?', reason: r.message || r.code || 'error' });
        }
      }
    } catch (err) {
      // Lote completo falló
      result.failed += batch.length;
      batch.forEach((id) => result.errors.push({ id, reason: (err as Error).message }));
    }
  }
  return result;
}

// Firma que cierra TODA nota creada por el agente (chat, admin o automatización).
// Pedido del negocio: que siempre quede claro que la nota vino del SUN BOT.
const NOTE_SIGNATURE = '\n\n🤖☀️ Nota dejada con WINDMAR AI Agent — SUN BOT';

/** Crea una nota en un lead. Siempre se firma con el sello del SUN BOT. */
export async function addLeadNote(
  leadId: string,
  content: string,
  title = 'Nota — Sun Bot'
): Promise<boolean> {
  const signed = content.trim().endsWith(NOTE_SIGNATURE.trim())
    ? content.trim()
    : content.trim() + NOTE_SIGNATURE;
  const body = { data: [{ Note_Title: title, Note_Content: signed }] };
  const res = (await zohoPost(`/Leads/${leadId}/Notes`, body)) as {
    data?: Array<{ code?: string; status?: string }>;
  };
  const r = res.data?.[0];
  return r?.code === 'SUCCESS' || r?.status === 'success';
}

/** Última nota de un lead (la más reciente), o null si no tiene. */
export async function getLeadLastNote(
  leadId: string
): Promise<{ content: string; createdAt: string | null } | null> {
  try {
    const res = (await zohoFetch(
      `/Leads/${leadId}/Notes?fields=Note_Content,Note_Title,Created_Time&sort_by=Created_Time&sort_order=desc&per_page=1`
    )) as { data?: Array<{ Note_Content?: string; Note_Title?: string; Created_Time?: string }> };
    const n = res.data?.[0];
    if (!n) return null;
    return {
      content: n.Note_Content || n.Note_Title || '(nota sin texto)',
      createdAt: n.Created_Time || null,
    };
  } catch {
    return null;
  }
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
