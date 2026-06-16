// ════════════════════════════════════════
// HERRAMIENTAS DE ZOHO PARA EL LLM (tool-use)
// ════════════════════════════════════════
// El asesor/jefe habla en lenguaje natural y el modelo decide qué herramienta
// llamar. Todo respeta el scoping por rol (ViewerScope): el Asesor solo ve/
// gestiona lo suyo; Líder/Admin ven todo y pueden escribir.

import type Anthropic from '@anthropic-ai/sdk';
import {
  getClientFull,
  getMyLeads,
  getLeadLastNote,
  getZohoUserIdByEmail,
  resolveAsesor,
  getDealsByQuery,
  searchContacts,
  searchLeads,
  detectQueryType,
  assignLeads,
  getLeadBasic,
  type LeadBasic,
} from '@/lib/zoho';
import { isActionable, BUCKET_LABEL, VALID_LEAD_STATUSES, resolveLeadStatus } from '@/lib/zoho-status';
import { getZohoMaps, logZohoQuery, getTipificarOptions } from '@/lib/zoho-config';
import {
  type ViewerScope,
  ownsLead,
  NOT_IN_PORTFOLIO_MSG,
} from '@/lib/zoho-access';
import type { ZohoPendingAction } from '@/lib/zoho-actions';
import type { ZohoLeadsCard, LeadCardRow, DealCardRow } from '@/lib/zoho-leads-card';
import type { ZohoClientCard, ClientDeal } from '@/lib/zoho-client-card';

/**
 * Resultado de una tool: texto para el modelo + (opcional) datos estructurados
 * que el cliente renderiza como tarjeta (acción, lista de leads o ficha cliente).
 */
export interface ZohoToolResult {
  content: string;
  action?: ZohoPendingAction;
  leads?: ZohoLeadsCard;
  client?: ZohoClientCard;
}

const WRITE_PREPARE_TOOLS = new Set(['agregar_nota', 'actualizar_estado', 'programar_seguimiento']);

/** Definiciones de las herramientas según permiso de escritura. */
export function getZohoToolDefs(canWrite: boolean): Anthropic.Tool[] {
  const tools: Anthropic.Tool[] = [
    {
      name: 'buscar_cliente',
      description:
        'Busca un cliente en Zoho CRM por email, teléfono, nombre, Lead# (L######) o nombre/número de DEAL (ej. "WQ005165360" o "38295 Carlos..."). Devuelve datos del lead, cotizaciones (deals), consultor e historial. Si el cliente ya fue CONVERTIDO (no tiene lead, solo Contacto+Deal), también lo encuentra y trae su contacto y deals. Úsala cuando pregunten por un cliente específico.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Email, teléfono, nombre, Lead# o nombre/número de deal del cliente' },
        },
        required: ['query'],
      },
    },
    {
      name: 'mis_leads',
      description:
        'Trae la cartera de leads desde Zoho como TABLA. Por defecto la del PROPIO usuario actual. Úsala para "mis leads", "mi cartera", "mis leads urgentes/de seguimiento", "¿a quién debo llamar?", "últimos N creados", "la cartera de [otro asesor]". REGLA CLAVE del parámetro "asesor": NO lo pases cuando el usuario habla de SU propia cartera ("mis leads", "mi cartera", "los míos") — déjalo vacío. SOLO pásalo cuando el usuario nombra EXPLÍCITAMENTE a OTRA persona distinta (ej. "la cartera de Juan Camilo Salas"), y entonces usa el NOMBRE COMPLETO o el correo, nunca solo el primer nombre.',
      input_schema: {
        type: 'object',
        properties: {
          asesor: {
            type: 'string',
            description: 'SOLO líderes/admins, y SOLO si el usuario pide la cartera de OTRA persona. Usa nombre COMPLETO o correo (ej. "j.salas@windmarhome.com" o "Juan Camilo Salas Montoya"). NUNCA pongas solo "juan" — hay muchos asesores con ese nombre. Para la cartera propia del usuario, OMITE este parámetro por completo.',
          },
          solo_seguimiento: {
            type: 'boolean',
            description: 'true = solo leads que necesitan seguimiento (sin nota en 24h).',
          },
          cantidad: {
            type: 'number',
            description: 'Cuántos leads mostrar en la tabla (default 15, máximo 25).',
          },
          ordenar_por: {
            type: 'string',
            enum: ['creacion', 'actividad'],
            description: '"creacion" = más recién creados primero (ej. "últimos 30 creados"). "actividad" (default) = última modificación.',
          },
          estado: {
            type: 'string',
            description: 'Filtra por Lead_Status (match parcial, ej. "No Contesta", "Cita", "Vendido").',
          },
          creado_desde: {
            type: 'string',
            description: 'Filtra leads creados desde esta fecha (YYYY-MM-DD). Ej: "leads de junio" → 2026-06-01.',
          },
          creado_hasta: {
            type: 'string',
            description: 'Filtra leads creados hasta esta fecha (YYYY-MM-DD). Ej: "leads de junio" → 2026-06-30.',
          },
        },
        required: [],
      },
    },
    // ── ESCRITURAS (disponibles para TODOS, incl. asesores) ──────────────
    // No escriben de inmediato: PREPARAN una acción que el usuario confirma con
    // un botón en el chat. El scoping (solo SU cartera para el asesor) se aplica
    // al preparar y de nuevo al ejecutar en /api/zoho/action.
    {
      name: 'agregar_nota',
      description: `Prepara una nota para el historial de un lead en Zoho. NO se guarda hasta que el usuario CONFIRME con el botón. Úsala cuando el asesor cuente qué pasó con un cliente ("llamé a X y no contestó", "quedó en pensarlo", "cerré la venta"). Necesitas el lead_id REAL (de una búsqueda de ESTE turno; JAMÁS lo inventes — si no lo tienes, busca el cliente primero).

PLANTILLAS — elige la que corresponda y rellena los {placeholders} con datos de la conversación. El sistema firma solo con el sello SUN BOT + el nombre del asesor, NO agregues firma:
- ✅ VENTA CERRADA — Caso vendido por {asesor} ({área}). Método de pago: {cash/loan/lease}. {detalle}
- 🤝 ASISTENCIA COORDINADA — Apoyo a {asesor original}. Venta cerrada por {asesor que cierra}. {detalle}
- 📞 SEGUIMIENTO — Contacto el {fecha}: {resultado}. Próximo paso: {acción y fecha}.
- 📵 NO CONTESTA — Intento #{n} el {fecha/hora}. Reintentar: {cuándo}.
- 📅 CITA COORDINADA — Cita para {fecha/hora} con {consultor}. {detalle}
- ⏰ LLAMAR DESPUÉS — Cliente pide contacto el {fecha/hora}. Motivo: {motivo}.
- ❌ NO INTERESADO / DQ — Motivo: {motivo}. {qué se intentó}
- ℹ️ INFO — {dato relevante}`,
      input_schema: {
        type: 'object',
        properties: {
          lead_id: { type: 'string', description: 'ID real del lead (de una búsqueda de este turno).' },
          contenido: { type: 'string', description: 'Texto de la nota según la plantilla. SIN firma (se agrega sola).' },
        },
        required: ['lead_id', 'contenido'],
      },
    },
    {
      name: 'actualizar_estado',
      description: `Prepara el cambio de estado (Lead_Status) de un lead. NO se aplica hasta que el usuario CONFIRME con el botón. Úsala cuando el asesor diga el resultado de la gestión ("márcalo como no contesta", "ya es cita coordinada", "el cliente no está interesado", "quedó vendido"). Necesitas el lead_id REAL de una búsqueda de este turno.

Estados válidos (usa el texto del asesor, el sistema lo mapea al oficial): ${VALID_LEAD_STATUSES.join(' · ')}.`,
      input_schema: {
        type: 'object',
        properties: {
          lead_id: { type: 'string', description: 'ID real del lead.' },
          estado: { type: 'string', description: 'Nuevo estado en lenguaje natural (ej. "no contesta", "cita coordinada", "vendido").' },
        },
        required: ['lead_id', 'estado'],
      },
    },
    {
      name: 'programar_seguimiento',
      description: `Prepara un recordatorio de seguimiento en campos nativos de Zoho. NO se guarda hasta que el usuario CONFIRME. Úsala cuando el asesor diga cuándo volver a contactar ("lo llamo mañana", "reintentar el viernes", "cita el jueves a las 2pm"). Necesitas el lead_id REAL de una búsqueda de este turno. Pasa al menos una fecha. Usa la fecha actual del contexto para resolver "mañana", "el viernes", etc.`,
      input_schema: {
        type: 'object',
        properties: {
          lead_id: { type: 'string', description: 'ID real del lead.' },
          fecha_llamada: { type: 'string', description: 'Fecha para "llamar después de" (YYYY-MM-DD).' },
          fecha_cita: { type: 'string', description: 'Fecha/hora de una cita agendada (ISO: YYYY-MM-DDTHH:mm:ss).' },
          nota: { type: 'string', description: 'Opcional: nota breve del seguimiento (se guarda junto al recordatorio).' },
        },
        required: ['lead_id'],
      },
    },
  ];

  if (canWrite) {
    tools.push({
      name: 'asignar_leads',
      description:
        'Reasigna uno o varios leads a un asesor (cambia el Owner en Zoho). SOLO para líderes/admins. Confirma con el usuario antes de asignar muchos leads.',
      input_schema: {
        type: 'object',
        properties: {
          lead_ids: { type: 'array', items: { type: 'string' }, description: 'IDs de los leads a reasignar' },
          asesor_email: { type: 'string', description: 'Correo del asesor destino (@windmarhome.com)' },
        },
        required: ['lead_ids', 'asesor_email'],
      },
    });
  }

  return tools;
}

const TRIAGE_LIMIT = 30;
const STALE_HOURS = 24;

/**
 * Ejecuta una herramienta de Zoho y devuelve un texto compacto para el modelo.
 * Mide latencia y registra el resultado en `zoho_query_log` (best-effort) para
 * el dashboard de salud. Aplica el scoping por rol vía `runZohoTool`.
 */
export async function executeZohoTool(
  name: string,
  input: Record<string, unknown>,
  scope: ViewerScope
): Promise<ZohoToolResult> {
  const start = Date.now();
  try {
    const out = WRITE_PREPARE_TOOLS.has(name)
      ? await prepareWriteTool(name, input, scope)
      : name === 'mis_leads'
      ? await runMisLeads(input, scope)
      : name === 'buscar_cliente'
      ? await runBuscarCliente(input, scope)
      : { content: await runZohoTool(name, input, scope) };
    logZohoQuery({ tool: name, ok: true, durationMs: Date.now() - start, userEmail: scope.email });
    return out;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'desconocido';
    logZohoQuery({ tool: name, ok: false, durationMs: Date.now() - start, error: msg, userEmail: scope.email });
    return { content: `Error ejecutando ${name}: ${msg}` };
  }
}

/** Lógica de cada herramienta (sin try/catch — el wrapper lo maneja). */
async function runZohoTool(
  name: string,
  input: Record<string, unknown>,
  scope: ViewerScope
): Promise<string> {
  switch (name) {
      case 'asignar_leads': {
        if (!scope.canSeeAll) return 'No tienes permiso para asignar leads (acción de líder/admin).';
        const leadIds = Array.isArray(input.lead_ids) ? (input.lead_ids as unknown[]).map(String) : [];
        const ownerEmail = String(input.asesor_email || '').trim().toLowerCase();
        if (leadIds.length === 0) return 'No se indicaron leads.';
        if (!ownerEmail) return 'Falta el correo del asesor destino.';
        const ownerId = await getZohoUserIdByEmail(ownerEmail);
        if (!ownerId) return `No se encontró el usuario de Zoho para ${ownerEmail}.`;
        const r = await assignLeads(leadIds, ownerId);
        return `Asignados ${r.success}/${r.total} leads a ${ownerEmail}.${r.failed ? ` Fallaron ${r.failed}.` : ''}`;
      }

      default:
        return `Herramienta desconocida: ${name}`;
    }
}

// ════════════════════════════════════════════════════════════════
// MIS LEADS — devuelve la lista como DATOS ESTRUCTURADOS (tarjeta rica)
// ════════════════════════════════════════════════════════════════
// Antes devolvía una tabla markdown que el modelo debía copiar; Haiku la
// parafraseaba y se la saltaba (visto en prod: "aquí están tus 29 leads" SIN
// lista). Ahora el cliente renderiza la tarjeta desde estos datos — siempre.

const NOTE_PREVIEW_LEN = 70;

/** Trae las últimas notas de un conjunto de leads (chunks de 8 en paralelo). */
async function fetchLastNotes(rows: Array<{ id: string }>) {
  const map = new Map<string, Awaited<ReturnType<typeof getLeadLastNote>>>();
  for (let i = 0; i < rows.length; i += 8) {
    const chunk = rows.slice(i, i + 8);
    const notes = await Promise.all(chunk.map((l) => getLeadLastNote(l.id)));
    chunk.forEach((l, idx) => map.set(l.id, notes[idx]));
  }
  return map;
}

async function runMisLeads(input: Record<string, unknown>, scope: ViewerScope): Promise<ZohoToolResult> {
  const soloSeguimiento = input.solo_seguimiento === true;
  // Sin número exacto → 30 (la tabla aguanta bien); con número, respeta hasta 40.
  const cantidad = Math.min(Math.max(Number(input.cantidad) || 30, 1), 40);
  const ordenarPor = input.ordenar_por === 'creacion' ? 'creacion' : 'actividad';
  const estadoFiltro = String(input.estado || '').trim().toLowerCase();

  // ── Resolución del DUEÑO de la cartera (anti-tocayo, ver resolveAsesor) ──
  const asesorQ = String(input.asesor || '').trim();
  let ownerId: string | null;
  let dueño = 'tu cartera';
  const self = await resolveAsesor(scope.email);
  const selfUser = self.kind === 'one' ? self.user : null;

  if (asesorQ && !scope.canSeeAll) {
    return { content: 'Solo los líderes/admins pueden ver la cartera de otro asesor. Pídeme "mis leads" (sin nombre) y te muestro la tuya.' };
  }
  if (asesorQ && scope.canSeeAll) {
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    const qWords = norm(asesorQ).split(/\s+/).filter(Boolean);
    const selfName = selfUser ? norm(selfUser.name) : '';
    const refersToSelf = !!selfUser && qWords.length > 0 && qWords.every((w) => selfName.includes(w));
    if (refersToSelf) {
      ownerId = selfUser!.id;
    } else {
      const r = await resolveAsesor(asesorQ);
      if (r.kind === 'none') {
        return { content: `No encontré a ningún asesor que coincida con "${asesorQ}" en Zoho. Verifica el nombre completo o usa su correo (@windmarhome.com).` };
      }
      if (r.kind === 'many') {
        const lista = r.candidates.map((c) => `- ${c.name} (${c.email})`).join('\n');
        return { content: `Hay ${r.candidates.length} asesores que coinciden con "${asesorQ}". Dime el NOMBRE COMPLETO o el correo de cuál quieres la cartera:\n${lista}` };
      }
      ownerId = r.user.id;
      dueño = `cartera de ${r.user.name}`;
    }
  } else {
    ownerId = selfUser?.id ?? (await getZohoUserIdByEmail(scope.email));
    if (!ownerId) {
      return { content: `No se encontró tu usuario de Zoho (${scope.email}). Pídele a un admin que sincronice los IDs de Zoho en /admin/usuarios.` };
    }
  }

  let leads = await getMyLeads(ownerId);
  if (leads.length === 0) return { content: `No hay leads en la ${dueño}.` };

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (estadoFiltro) {
    const f = norm(estadoFiltro);
    leads = leads.filter((l) => norm(l.status || '').includes(f));
    if (leads.length === 0) return { content: `No tienes leads con estado que contenga "${input.estado}".` };
  }
  const desde = String(input.creado_desde || '').trim();
  const hasta = String(input.creado_hasta || '').trim();
  if (desde) leads = leads.filter((l) => (l.createdAt || '') >= desde);
  if (hasta) leads = leads.filter((l) => (l.createdAt || '').slice(0, 10) <= hasta);
  if ((desde || hasta) && leads.length === 0) {
    return { content: `No tienes leads creados en ese rango de fechas (${desde || '…'} a ${hasta || 'hoy'}).` };
  }
  if (ordenarPor === 'creacion') {
    leads = [...leads].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  // Selección a mostrar: triage (accionables sin nota 24h) o cartera normal.
  let rows = leads;
  let title: string;
  let subtitleBase: string;
  if (soloSeguimiento) {
    const actionable = leads.filter((l) => isActionable(l.bucket)).slice(0, TRIAGE_LIMIT);
    const notesA = await fetchLastNotes(actionable);
    const cutoff = Date.now() - STALE_HOURS * 3600 * 1000;
    rows = actionable.filter((l) => {
      const note = notesA.get(l.id);
      const t = note?.createdAt ? Date.parse(note.createdAt) : 0;
      return !note || isNaN(t) || t < cutoff;
    });
    if (rows.length === 0) {
      return { content: '¡Todo al día! Ningún lead accionable sin nota en las últimas 24h. Felicítalo brevemente y NO muestres tabla.' };
    }
    title = dueño === 'tu cartera' ? 'Leads que necesitan seguimiento' : `Seguimiento — ${dueño}`;
    subtitleBase = `${rows.length} sin nota en ${STALE_HOURS}h${estadoFiltro ? ` · ${input.estado}` : ''}`;
  } else {
    rows = leads.slice(0, cantidad);
    title = dueño === 'tu cartera' ? 'Mi cartera' : dueño.charAt(0).toUpperCase() + dueño.slice(1);
    const ordenTxt = ordenarPor === 'creacion' ? 'más recientes' : 'con actividad reciente';
    subtitleBase = `${leads.length} leads${estadoFiltro ? ` · ${input.estado}` : ''}${leads.length > rows.length ? ` · mostrando ${rows.length} ${ordenTxt}` : ''}`;
  }

  // La tabla NO muestra columna de nota → no traemos notas aquí (rápido). El
  // triage de arriba ya consultó notas solo para FILTRAR los stale.
  const cardRows: LeadCardRow[] = rows.map((l) => ({
    id: l.id,
    leadNumber: l.leadNumber,
    fullName: l.fullName,
    status: l.status,
    bucket: l.bucket,
    owner: l.owner,
    consultor: l.consultor,
    createdAt: l.createdAt,
    zohoUrl: l.zohoUrl,
    phone: l.phone,
    lastNote: null,
  }));

  const byBucket: Record<string, number> = {};
  for (const l of leads) byBucket[l.bucket] = (byBucket[l.bucket] || 0) + 1;

  const card: ZohoLeadsCard = {
    title,
    subtitle: subtitleBase,
    total: soloSeguimiento ? rows.length : leads.length,
    rows: cardRows,
    byBucket,
    tipificarOptions: await getTipificarOptions(),
  };

  // Lo que ve el MODELO: NO la lista (la pinta el cliente), solo instrucción +
  // resumen para que escriba un intro inteligente. Así Haiku ya no "parafrasea"
  // ni se salta la tabla.
  const resumen = Object.entries(byBucket)
    .map(([b, n]) => `${BUCKET_LABEL[b as keyof typeof BUCKET_LABEL] || b}: ${n}`)
    .join(' · ');
  const content = [
    `LISTA DE LEADS YA MOSTRADA al asesor como tarjeta visual (${card.total} ${soloSeguimiento ? 'que necesitan seguimiento' : 'leads'}${estadoFiltro ? `, filtro "${input.estado}"` : ''}). Distribución: ${resumen}.`,
    'Tu respuesta: SOLO 1 frase corta de contexto (ej. "¡Aquí tienes tus más urgentes, Juanse! 👇"). NO listes los leads, NO escribas tabla, NO los analices en prosa — la tarjeta ya los muestra.',
    'Luego pon un bloque <quick_replies> con 3 chips accionables sobre estos leads (ej. "¿A quién llamo primero?", "Busca a [nombre] y dime qué pasó", "Déjale nota de seguimiento al primero").',
  ].join('\n');

  return { content, leads: card };
}

// ════════════════════════════════════════════════════════════════
// BUSCAR CLIENTE — ficha como DATOS ESTRUCTURADOS (tarjeta rica)
// ════════════════════════════════════════════════════════════════
// Igual que mis_leads: ya no devuelve texto para que el modelo lo redacte. El
// cliente pinta la ficha con ClientCardChat; el modelo solo da coaching breve.

async function runBuscarCliente(input: Record<string, unknown>, scope: ViewerScope): Promise<ZohoToolResult> {
  const query = String(input.query || '').trim();
  if (query.length < 3) return { content: 'Query muy corta — pídele al asesor email, teléfono, nombre o Lead#.' };

  const maps = await getZohoMaps();

  // ── TELÉFONO / CORREO / NOMBRE → TABLA (estilo NOTAS VASS): últimos leads +
  //    deals del contacto. Lead# (L######) NO entra aquí: cae a la ficha + cuadro.
  if (detectQueryType(query) !== 'leadNumber') {
    const [leadsRaw, dealsRaw] = await Promise.all([searchLeads(query, 10), getDealsByQuery(query)]);
    const visLeads = scope.canSeeAll ? leadsRaw : leadsRaw.filter((l) => (l.ownerEmail || '').toLowerCase() === scope.email);
    const visDeals = scope.canSeeAll ? dealsRaw : dealsRaw.filter((d) => (d.ownerEmail || '').toLowerCase() === scope.email);
    if (visLeads.length === 0 && visDeals.length === 0) {
      return { content: `No encontré "${query}" en Zoho${scope.canSeeAll ? '' : ' en tu cartera'}. Dile al asesor que verifique el dato — NO inventes resultados.` };
    }
    const byCreated = (a: { createdAt: string | null }, b: { createdAt: string | null }) => (b.createdAt || '').localeCompare(a.createdAt || '');
    const leads3 = [...visLeads].sort(byCreated).slice(0, 3);
    const deals3 = [...visDeals].sort(byCreated).slice(0, 3);
    const rows: LeadCardRow[] = leads3.map((l) => ({
      id: l.id, leadNumber: l.leadNumber, fullName: l.fullName, status: l.stage,
      bucket: maps.bucketOf(l.stage), owner: l.owner, consultor: l.consultor,
      createdAt: l.createdAt, zohoUrl: l.zohoUrl, phone: l.mobile || l.phone, lastNote: null,
    }));
    const dealRows: DealCardRow[] = deals3.map((d) => ({
      name: d.name, stage: d.stage, amount: d.amount, contactName: d.contactName,
      owner: d.owner, createdAt: d.createdAt, zohoUrl: d.zohoUrl,
    }));
    const card: ZohoLeadsCard = {
      title: `Resultados para "${query}"`,
      subtitle: `${visLeads.length} lead(s) · ${visDeals.length} deal(s) — los más recientes`,
      total: visLeads.length,
      rows,
      deals: dealRows.length ? dealRows : undefined,
      tipificarOptions: await getTipificarOptions(),
    };
    return {
      content: `BÚSQUEDA mostrada como TABLA (${rows.length} leads, ${dealRows.length} deals del contacto). NO repitas la lista ni inventes. Di 1 frase corta; si hay varios, sugiere abrir el correcto con "Abre el lead L######".`,
      leads: card,
    };
  }

  const full = await getClientFull(query);

  // FALLBACK — cliente CONVERTIDO (sin lead; Contacto/Deal). Scoping por owner.
  if (!full) {
    const [deals, contacts] = await Promise.all([getDealsByQuery(query), searchContacts(query)]);
    const visDeals = scope.canSeeAll ? deals : deals.filter((d) => (d.ownerEmail || '').toLowerCase() === scope.email);
    const visContacts = scope.canSeeAll ? contacts : contacts.filter((c) => (c.ownerEmail || '').toLowerCase() === scope.email);
    if (visDeals.length === 0 && visContacts.length === 0) {
      return { content: `No se encontró "${query}" en Zoho (ni lead, ni contacto, ni deal${scope.canSeeAll ? '' : ' en tu cartera'}). Dile al asesor que verifique el dato.` };
    }
    const c = visContacts[0];
    const cardDeals: ClientDeal[] = visDeals.slice(0, 6).map((d) => ({ name: d.name, stage: d.stage, amount: d.amount, zohoUrl: d.zohoUrl }));
    const comprados = visDeals.filter((d) => maps.isDealCompleted(d.stage)).map((d) => d.name);
    const card: ZohoClientCard = {
      kind: 'convertido',
      fullName: c?.fullName || (visDeals[0]?.contactName ?? 'Cliente'),
      leadId: null, leadNumber: null, status: null, bucket: null,
      email: c?.email ?? null, phone: c?.phone ?? null,
      owner: c?.owner ?? visDeals[0]?.owner ?? null, consultor: null,
      zohoUrl: c?.zohoUrl || visDeals[0]?.zohoUrl || '',
      sistemaComprado: comprados.length ? comprados.join(', ') : (visDeals.length ? 'En proceso de instalación' : '—'),
      totalDeals: visDeals.length,
      dealsAbiertos: visDeals.filter((d) => !maps.isDealCompleted(d.stage) && maps.dealStateOf(d.stage) !== 'perdido').length,
      deals: cardDeals,
    };
    return {
      content: `FICHA mostrada como tarjeta: cliente CONVERTIDO ${card.fullName} (ya es Contacto/Deal, sin lead). NO repitas los datos. En 1-2 frases di el próximo paso (postventa, referidos, ampliación). Cierra con <quick_replies> de 3 chips.`,
      client: card,
    };
  }

  if (!ownsLead(full.lead, scope)) return { content: NOT_IN_PORTFOLIO_MSG };
  const l = full.lead;
  const tipificarOptions = await getTipificarOptions();
  const card: ZohoClientCard = {
    kind: 'lead',
    fullName: l.fullName,
    leadId: l.id,
    leadNumber: l.leadNumber,
    status: l.stage,
    bucket: maps.bucketOf(l.stage),
    email: l.email,
    phone: l.mobile || l.phone,
    owner: l.owner,
    consultor: l.consultor,
    zohoUrl: l.zohoUrl,
    sistemaComprado: full.summary.sistemaComprado,
    totalDeals: full.summary.totalDeals,
    dealsAbiertos: full.summary.dealsAbiertos,
    deals: full.deals.slice(0, 6).map((d) => ({ name: d.name, stage: d.stage, amount: d.amount, zohoUrl: d.zohoUrl })),
    tipificarOptions,
  };
  return {
    content: `FICHA de ${l.fullName} (Lead ${l.leadNumber || l.id}, estado "${l.stage || 'sin estado'}") mostrada como tarjeta — NO repitas los datos ni escribas tabla. En 1-2 frases da el PRÓXIMO PASO de gestión según su estado y lo comprado (${full.summary.sistemaComprado}). Cierra con <quick_replies> de 3 chips accionables (ej. dejar nota, marcar estado, programar seguimiento).`,
    client: card,
  };
}

// ════════════════════════════════════════════════════════════════
// PREPARADOR DE ESCRITURAS — valida + arma la acción a confirmar (no escribe)
// ════════════════════════════════════════════════════════════════
// Aplica el scoping por dueño: el asesor solo puede preparar acciones sobre SUS
// leads. La escritura real ocurre en /api/zoho/action tras el clic de confirmar
// (que VUELVE a validar el dueño — esta capa no es la única defensa).

/** Valida que el lead exista y sea del usuario; devuelve el lead o un error. */
async function loadOwnedLead(
  leadId: string,
  scope: ViewerScope
): Promise<{ lead: LeadBasic } | { error: string }> {
  if (!leadId) return { error: 'Falta el lead. Busca el cliente primero y reintenta con su Lead#.' };
  const lead = await getLeadBasic(leadId);
  if (!lead) return { error: `No encontré el lead ${leadId} en Zoho. Búscalo de nuevo y reintenta.` };
  if (!ownsLead({ ownerEmail: lead.ownerEmail }, scope)) return { error: NOT_IN_PORTFOLIO_MSG };
  return { lead };
}

/** Mensaje estándar para el modelo cuando una acción quedó lista para confirmar. */
function preparedMsg(resumen: string): string {
  return `ACCIÓN PREPARADA (todavía NO se guardó en Zoho): ${resumen}. En UNA frase corta dile al asesor que revise y confirme con el botón de abajo. NO repitas los datos ni agregues bloque <quick_replies> (la tarjeta ya tiene sus botones).`;
}

async function prepareWriteTool(
  name: string,
  input: Record<string, unknown>,
  scope: ViewerScope
): Promise<ZohoToolResult> {
  const leadId = String(input.lead_id || '').trim();
  const owned = await loadOwnedLead(leadId, scope);
  if ('error' in owned) return { content: owned.error };
  const { lead } = owned;
  const who = `${lead.fullName}${lead.leadNumber ? ` (${lead.leadNumber})` : ''}`;

  switch (name) {
    case 'agregar_nota': {
      const contenido = String(input.contenido || '').trim();
      if (contenido.length < 2) return { content: 'Falta el texto de la nota.' };
      const resumen = `nota para ${who}`;
      return {
        content: preparedMsg(resumen),
        action: {
          type: 'nota',
          leadId: lead.id,
          leadNumber: lead.leadNumber,
          fullName: lead.fullName,
          summary: resumen,
          nota: { contenido },
        },
      };
    }

    case 'actualizar_estado': {
      const raw = String(input.estado || '').trim();
      const nuevoEstado = resolveLeadStatus(raw);
      if (!nuevoEstado) {
        return {
          content: `No reconocí el estado "${raw}". Pídele al asesor que elija uno válido: ${VALID_LEAD_STATUSES.join(' · ')}.`,
        };
      }
      const resumen = `cambiar estado de ${who}: ${lead.status || 'sin estado'} → ${nuevoEstado}`;
      return {
        content: preparedMsg(resumen),
        action: {
          type: 'estado',
          leadId: lead.id,
          leadNumber: lead.leadNumber,
          fullName: lead.fullName,
          summary: resumen,
          estado: { nuevoEstado },
        },
      };
    }

    case 'programar_seguimiento': {
      const callDate = String(input.fecha_llamada || '').trim() || null;
      const appointmentAt = String(input.fecha_cita || '').trim() || null;
      const nota = String(input.nota || '').trim() || null;
      if (!callDate && !appointmentAt) {
        return { content: 'Dime para cuándo: una fecha para llamar (ej. "mañana") o una fecha/hora de cita.' };
      }
      // Validación ligera de formato (Zoho rechaza formatos malos)
      if (callDate && !/^\d{4}-\d{2}-\d{2}$/.test(callDate)) {
        return { content: `La fecha de llamada debe ser YYYY-MM-DD (recibí "${callDate}").` };
      }
      const partes = [
        callDate ? `llamar desde ${callDate}` : '',
        appointmentAt ? `cita ${appointmentAt.replace('T', ' ').slice(0, 16)}` : '',
      ].filter(Boolean).join(' · ');
      const resumen = `seguimiento de ${who}: ${partes}`;
      return {
        content: preparedMsg(resumen),
        action: {
          type: 'seguimiento',
          leadId: lead.id,
          leadNumber: lead.leadNumber,
          fullName: lead.fullName,
          summary: resumen,
          seguimiento: { callDate, appointmentAt, nota },
        },
      };
    }

    default:
      return { content: `Herramienta de escritura desconocida: ${name}` };
  }
}
