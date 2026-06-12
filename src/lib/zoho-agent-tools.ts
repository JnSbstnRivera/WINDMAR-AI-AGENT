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
        'Busca un cliente/lead en Zoho CRM por email, teléfono, nombre o número de lead (LD-000123). Devuelve datos del lead, sus cotizaciones (deals), consultor asignado e historial. Úsala cuando el asesor pregunte por un cliente específico ("¿qué pasó con María?", "busca a juan@correo.com", "el cliente del 787...").',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Email, teléfono, nombre o número de lead del cliente' },
        },
        required: ['query'],
      },
    },
    {
      name: 'mis_leads',
      description:
        'Trae la cartera de leads del asesor desde Zoho, agrupada por estado. Si solo_seguimiento=true, devuelve solo los leads accionables SIN nota en las últimas 24h (los que necesitan seguimiento hoy). Úsala para "mis leads", "mi cartera", "mi pipeline", "¿a quién debo llamar?", "leads pendientes", "qué tengo sin seguir".',
      input_schema: {
        type: 'object',
        properties: {
          solo_seguimiento: {
            type: 'boolean',
            description: 'true = solo leads que necesitan seguimiento (sin nota en 24h). false = toda la cartera.',
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
        description:
          'Agrega una nota a un lead en Zoho (queda en el historial del cliente). SOLO para líderes/admins.',
        input_schema: {
          type: 'object',
          properties: {
            lead_id: { type: 'string', description: 'ID del lead' },
            contenido: { type: 'string', description: 'Texto de la nota' },
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
        if (!client) return `No se encontró ningún cliente con "${query}" en Zoho.`;
        if (!ownsLead(client.lead, scope)) return NOT_IN_PORTFOLIO_MSG;
        const l = client.lead;
        const deals = client.deals
          .slice(0, 6)
          .map((d) => `  - ${d.name} · ${d.stage || '?'}${d.amount ? ' · ' + d.amount : ''}`)
          .join('\n');
        return [
          `CLIENTE: ${l.fullName}`,
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
        const ownerId = await getZohoUserIdByEmail(scope.email);
        if (!ownerId) return `No se encontró tu usuario de Zoho (${scope.email}). Pídele a un admin que sincronice los IDs de Zoho en /admin/usuarios.`;
        const leads = await getMyLeads(ownerId);
        if (leads.length === 0) return 'No tienes leads en tu cartera de Zoho.';

        if (!soloSeguimiento) {
          const byBucket: Record<string, number> = {};
          for (const l of leads) byBucket[l.bucket] = (byBucket[l.bucket] || 0) + 1;
          const resumen = Object.entries(byBucket)
            .map(([b, n]) => `${BUCKET_LABEL[b as keyof typeof BUCKET_LABEL] || b}: ${n}`)
            .join(' · ');
          const muestra = leads
            .slice(0, 15)
            .map((l) => `  - ${l.fullName} · ${l.status || 'sin estado'} · ${l.zohoUrl}`)
            .join('\n');
          return `CARTERA (${leads.length} leads) — ${resumen}\nMuestra:\n${muestra}${leads.length > 15 ? `\n…y ${leads.length - 15} más.` : ''}`;
        }

        // Triage: revisar última nota de los accionables (acotado)
        const actionable = leads.filter((l) => isActionable(l.bucket)).slice(0, TRIAGE_LIMIT);
        const cutoff = Date.now() - STALE_HOURS * 3600 * 1000;
        const stale: string[] = [];
        for (let i = 0; i < actionable.length; i += 8) {
          const chunk = actionable.slice(i, i + 8);
          const notes = await Promise.all(chunk.map((l) => getLeadLastNote(l.id)));
          chunk.forEach((l, idx) => {
            const note = notes[idx];
            const t = note?.createdAt ? Date.parse(note.createdAt) : 0;
            if (!note || isNaN(t) || t < cutoff) {
              stale.push(`  - ${l.fullName} · ${l.status || 'sin estado'} · ${l.zohoUrl}`);
            }
          });
        }
        if (stale.length === 0) return '¡Todo al día! Ningún lead accionable sin nota en las últimas 24h.';
        return `LEADS QUE NECESITAN SEGUIMIENTO (sin nota en 24h) — ${stale.length} de ${actionable.length} revisados:\n${stale.join('\n')}`;
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
