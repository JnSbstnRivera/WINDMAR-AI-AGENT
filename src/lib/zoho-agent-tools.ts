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
  findZohoUserByQuery,
  getDealsByQuery,
  searchContacts,
  assignLeads,
  addLeadNote,
} from '@/lib/zoho';
import { bucketOf, isActionable, BUCKET_LABEL } from '@/lib/zoho-status';
import {
  type ViewerScope,
  ownsLead,
  NOT_IN_PORTFOLIO_MSG,
} from '@/lib/zoho-access';

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
        'Trae la cartera de leads desde Zoho como TABLA. Por defecto la del usuario actual; los LÍDERES/ADMINS pueden pedir la de OTRO asesor con el parámetro "asesor" (nombre o correo — ej. "los leads de juan sebastian rivera"). Soporta: cantidad de filas, orden por creación o actividad, filtro por estado (ej. "No Contesta"), filtro por fechas, y modo seguimiento (sin nota en 24h). Úsala para "mis leads", "la cartera de X", "últimos N creados", "¿a quién debo llamar?".',
      input_schema: {
        type: 'object',
        properties: {
          asesor: {
            type: 'string',
            description: 'SOLO líderes/admins: nombre o correo del asesor cuya cartera quieres ver (ej. "j.salas@windmarhome.com" o "juan sebastian rivera"). Omitir = cartera propia.',
          },
          solo_seguimiento: {
            type: 'boolean',
            description: 'true = solo leads que necesitan seguimiento (sin nota en 24h).',
          },
          cantidad: {
            type: 'number',
            description: 'Cuántos leads mostrar en la tabla (default 15, máximo 40).',
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
  ];

  if (canWrite) {
    tools.push(
      {
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
      },
      {
        name: 'agregar_nota',
        description: `Agrega una nota a un lead en Zoho (queda en el historial del cliente). SOLO para líderes/admins.

PLANTILLAS — elige la que corresponda al escenario y rellena los {placeholders} con datos de la conversación (pregunta si falta algo clave). El sistema firma automáticamente con el sello SUN BOT, NO agregues firma:
- ✅ VENTA CERRADA — Caso vendido por {asesor} ({área}). Método de pago: {cash/loan/lease}. {detalle opcional}
- 🤝 ASISTENCIA COORDINADA — Gestión conjunta: apoyo a {asesor original} ({área}). Venta cerrada por {asesor que cierra} ({área}). {detalle}
- 📞 SEGUIMIENTO — Contacto el {fecha}: {resultado}. Próximo paso: {acción y fecha}.
- 📵 NO CONTESTA — Intento #{n} el {fecha/hora}. Reintentar: {cuándo / otra hora o canal}.
- 📅 CITA COORDINADA — Cita para {fecha/hora} con {consultor}. {detalle}
- ⏰ LLAMAR DESPUÉS — Cliente pide contacto el {fecha/hora}. Motivo: {motivo}.
- ❌ NO INTERESADO / DQ — Motivo: {motivo}. {qué se intentó}
- ℹ️ INFO — {dato relevante del cliente o la gestión}`,
        input_schema: {
          type: 'object',
          properties: {
            lead_id: { type: 'string', description: 'ID del lead' },
            contenido: {
              type: 'string',
              description: 'Texto de la nota siguiendo la plantilla del escenario. SIN firma (se agrega sola).',
            },
          },
          required: ['lead_id', 'contenido'],
        },
      }
    );
  }

  return tools;
}

const TRIAGE_LIMIT = 30;
const STALE_HOURS = 24;

/**
 * Ejecuta una herramienta de Zoho y devuelve un texto compacto para el modelo.
 * Aplica el scoping por rol del `scope`.
 */
export async function executeZohoTool(
  name: string,
  input: Record<string, unknown>,
  scope: ViewerScope
): Promise<string> {
  try {
    switch (name) {
      case 'buscar_cliente': {
        const query = String(input.query || '').trim();
        if (query.length < 3) return 'Query muy corta.';
        const client = await getClientFull(query);

        // FALLBACK — cliente CONVERTIDO: sin lead, pero con Contacto y/o Deals
        // (ej. "38295 Carlos Manuel Munoz Arce WQ005165360"). Scoping por
        // owner del contacto/deal para asesores no elevados.
        if (!client) {
          const [deals, contacts] = await Promise.all([getDealsByQuery(query), searchContacts(query)]);
          const visDeals = scope.canSeeAll
            ? deals
            : deals.filter((d) => (d.ownerEmail || '').toLowerCase() === scope.email);
          const visContacts = scope.canSeeAll
            ? contacts
            : contacts.filter((c) => (c.ownerEmail || '').toLowerCase() === scope.email);

          if (visDeals.length === 0 && visContacts.length === 0) {
            return `No se encontró "${query}" en Zoho (ni lead, ni contacto, ni deal${scope.canSeeAll ? '' : ' en tu cartera'}).`;
          }

          const c = visContacts[0];
          const lines: string[] = [];
          lines.push(`CLIENTE CONVERTIDO (ya no tiene lead — está como Contacto/Deal)${c ? `: ${c.fullName}` : ''}`);
          if (c) {
            lines.push(`Email: ${c.email || '—'} · Tel: ${c.phone || '—'}`);
            lines.push(`Owner del contacto: ${c.owner || '—'}`);
            lines.push(`Contacto en Zoho: ${c.zohoUrl}`);
          }
          if (visDeals.length > 0) {
            lines.push(`DEALS (${visDeals.length}):`);
            visDeals.slice(0, 6).forEach((d) =>
              lines.push(
                `  - ${d.name} · ${d.stage || '?'}${d.amount ? ' · ' + d.amount : ''}${d.closingDate ? ' · cierre ' + d.closingDate : ''} · owner ${d.owner || '—'} · ${d.zohoUrl}`
              )
            );
          }
          return lines.join('\n');
        }

        if (!ownsLead(client.lead, scope)) return NOT_IN_PORTFOLIO_MSG;
        const l = client.lead;
        const deals = client.deals
          .slice(0, 6)
          .map((d) => `  - ${d.name} · ${d.stage || '?'}${d.amount ? ' · ' + d.amount : ''}`)
          .join('\n');
        return [
          `CLIENTE: ${l.fullName}`,
          `Lead #: ${l.leadNumber || '—'} · enlace: ${l.zohoUrl}`,
          `Estado: ${l.stage || 'sin estado'} (bucket: ${BUCKET_LABEL[bucketOf(l.stage)]})`,
          `Email: ${l.email || 'no registrado'} · Tel: ${l.mobile || l.phone || 'no registrado'}`,
          `Consultor (Sales_Rep): ${l.consultor || 'sin asignar'}`,
          `Owner (lead owner): ${l.owner || 'sin asignar'}`,
          `Sistema comprado: ${client.summary.sistemaComprado}`,
          `Cotizaciones: ${client.summary.totalDeals} (${client.summary.dealsAbiertos} abiertas)`,
          deals ? `Deals:\n${deals}` : 'Sin deals.',
          `Hipervínculo Zoho: ${l.zohoUrl}`,
          `Lead ID: ${l.id}`,
        ].join('\n');
      }

      case 'mis_leads': {
        const soloSeguimiento = input.solo_seguimiento === true;
        const cantidad = Math.min(Math.max(Number(input.cantidad) || 15, 1), 40);
        const ordenarPor = input.ordenar_por === 'creacion' ? 'creacion' : 'actividad';
        const estadoFiltro = String(input.estado || '').trim().toLowerCase();

        // Cartera de OTRO asesor (solo líderes/admins; por nombre o correo)
        const asesorQ = String(input.asesor || '').trim();
        let ownerId: string | null;
        let dueño = 'tu cartera';
        if (asesorQ && scope.canSeeAll) {
          const u = await findZohoUserByQuery(asesorQ);
          if (!u) return `No encontré al usuario "${asesorQ}" en Zoho. Verifica el nombre o usa su correo.`;
          ownerId = u.id;
          dueño = `cartera de ${u.name}`;
        } else if (asesorQ && !scope.canSeeAll) {
          return 'Solo los líderes/admins pueden ver la cartera de otro asesor. Te muestro la tuya si me la pides sin nombre.';
        } else {
          ownerId = await getZohoUserIdByEmail(scope.email);
          if (!ownerId) return `No se encontró tu usuario de Zoho (${scope.email}). Pídele a un admin que sincronice los IDs de Zoho en /admin/usuarios.`;
        }
        let leads = await getMyLeads(ownerId);
        if (leads.length === 0) return `No hay leads en la ${dueño}.`;

        // Filtro por estado (match parcial, sin acentos ni mayúsculas)
        const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (estadoFiltro) {
          const f = norm(estadoFiltro);
          leads = leads.filter((l) => norm(l.status || '').includes(f));
          if (leads.length === 0) return `No tienes leads con estado que contenga "${input.estado}".`;
        }

        // Filtro por fecha de creación (YYYY-MM-DD, comparación lexicográfica sobre ISO)
        const desde = String(input.creado_desde || '').trim();
        const hasta = String(input.creado_hasta || '').trim();
        if (desde) leads = leads.filter((l) => (l.createdAt || '') >= desde);
        if (hasta) leads = leads.filter((l) => (l.createdAt || '').slice(0, 10) <= hasta);
        if ((desde || hasta) && leads.length === 0) {
          return `No tienes leads creados en ese rango de fechas (${desde || '…'} a ${hasta || 'hoy'}).`;
        }

        // Orden: por defecto última actividad (ya viene así); 'creacion' = más nuevos primero
        if (ordenarPor === 'creacion') {
          leads = [...leads].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        }

        // Helpers de formato para la tabla
        const fmtFecha = (iso: string | null) => (iso ? iso.slice(0, 10) : '—');
        const fmtNota = (note: { content: string; createdAt: string | null } | null) => {
          if (!note) return '⚠️ sin notas';
          const txt = note.content.replace(/\s+/g, ' ').trim();
          const preview = txt.length > 60 ? txt.slice(0, 57) + '…' : txt;
          return `${preview} (${fmtFecha(note.createdAt)})`;
        };
        // Escapar pipes para no romper la tabla markdown
        const esc = (s: string) => s.replace(/\|/g, '/');

        const buildTable = (rows: typeof leads, notes: Map<string, Awaited<ReturnType<typeof getLeadLastNote>>>) => {
          const header = '| Lead | Cliente | Estado | Owner | Consultor | Creado | Última nota |\n|---|---|---|---|---|---|---|';
          const body = rows
            .map((l) => {
              const nota = notes.has(l.id) ? fmtNota(notes.get(l.id) ?? null) : '—';
              const leadLink = `[${esc(l.leadNumber || 'abrir')}](${l.zohoUrl})`;
              return `| ${leadLink} | [${esc(l.fullName)}](${l.zohoUrl}) | ${esc(l.status || 'sin estado')} | ${esc(l.owner || '—')} | ${esc(l.consultor || '—')} | ${fmtFecha(l.createdAt)} | ${esc(nota)} |`;
            })
            .join('\n');
          return `${header}\n${body}`;
        };

        // Trae las últimas notas de un conjunto de leads (chunks de 8)
        const fetchNotes = async (rows: typeof leads) => {
          const map = new Map<string, Awaited<ReturnType<typeof getLeadLastNote>>>();
          for (let i = 0; i < rows.length; i += 8) {
            const chunk = rows.slice(i, i + 8);
            const notes = await Promise.all(chunk.map((l) => getLeadLastNote(l.id)));
            chunk.forEach((l, idx) => map.set(l.id, notes[idx]));
          }
          return map;
        };

        const FORMATO =
          'INSTRUCCIÓN DE FORMATO (OBLIGATORIA — RESPUESTA PLANA): tu respuesta es SOLO: 1 línea corta de contexto + la TABLA markdown de abajo TAL CUAL (enlaces [..](..) intactos). La TABLA es obligatoria SIEMPRE — aunque tenga 1 SOLA fila, NUNCA la conviertas en prosa; el formato debe ser idéntico en cada consulta de leads de la conversación. NADA MÁS de texto: cero análisis, cero secciones tipo "CALIENTE/REVISAR", cero recomendaciones en prosa, cero preguntas al final. PROHIBIDO inventar o agregar filas, columnas, Lead IDs, teléfonos o totales que no estén abajo. Todo tu COACHING va EXCLUSIVAMENTE en el bloque <quick_replies> como 3 chips accionables sobre estos leads concretos (ej: "Busca a {nombre} y dime qué pasó", "¿A quién llamo primero?", "Dame solo los No Contesta") — el asesor selecciona el que quiera.';

        if (!soloSeguimiento) {
          const shown = leads.slice(0, cantidad);
          const notes = await fetchNotes(shown);
          const byBucket: Record<string, number> = {};
          for (const l of leads) byBucket[l.bucket] = (byBucket[l.bucket] || 0) + 1;
          const resumen = Object.entries(byBucket)
            .map(([b, n]) => `${BUCKET_LABEL[b as keyof typeof BUCKET_LABEL] || b}: ${n}`)
            .join(' · ');
          const ordenTxt = ordenarPor === 'creacion' ? 'más recién creados' : 'con actividad más reciente';
          const filtroTxt = estadoFiltro ? ` con estado "${input.estado}"` : '';
          const duenoTxt = dueño === 'tu cartera' ? '' : ` (${dueño})`;
          return `${FORMATO}\n\nCARTERA${duenoTxt}${filtroTxt}: ${leads.length} leads (${resumen})${leads.length > shown.length ? ` — mostrando los ${shown.length} ${ordenTxt}` : ''}\n\n${buildTable(shown, notes)}`;
        }

        // Triage: leads accionables SIN nota en las últimas 24h
        const actionable = leads.filter((l) => isActionable(l.bucket)).slice(0, TRIAGE_LIMIT);
        const cutoff = Date.now() - STALE_HOURS * 3600 * 1000;
        const notes = await fetchNotes(actionable);
        const stale = actionable.filter((l) => {
          const note = notes.get(l.id);
          const t = note?.createdAt ? Date.parse(note.createdAt) : 0;
          return !note || isNaN(t) || t < cutoff;
        });
        if (stale.length === 0) return '¡Todo al día! Ningún lead accionable sin nota en las últimas 24h.';
        return `${FORMATO}\n\nLEADS QUE NECESITAN SEGUIMIENTO (sin nota en ${STALE_HOURS}h): ${stale.length} de ${actionable.length} accionables revisados\n\n${buildTable(stale, notes)}`;
      }

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

      case 'agregar_nota': {
        if (!scope.canSeeAll) return 'No tienes permiso para escribir notas (acción de líder/admin).';
        const leadId = String(input.lead_id || '').trim();
        const contenido = String(input.contenido || '').trim();
        if (!leadId || contenido.length < 2) return 'Falta el lead o el texto de la nota.';
        const ok = await addLeadNote(leadId, contenido, `Nota de ${scope.email}`);
        return ok ? 'Nota guardada en Zoho.' : 'Zoho no aceptó la nota.';
      }

      default:
        return `Herramienta desconocida: ${name}`;
    }
  } catch (err) {
    return `Error ejecutando ${name}: ${err instanceof Error ? err.message : 'desconocido'}`;
  }
}
