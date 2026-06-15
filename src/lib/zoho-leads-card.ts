// ════════════════════════════════════════════════════════════════
// TARJETA DE LISTA DE LEADS — datos estructurados (client-safe)
// ════════════════════════════════════════════════════════════════
// En vez de pedirle al modelo que "copie" una tabla markdown (Haiku la
// parafrasea y se la salta), la lista de leads viaja como JSON dentro de un
// bloque <zoho_leads>{json}</zoho_leads> en el stream. El cliente la pinta como
// tarjeta rica (LeadsCard), SIEMPRE — sin depender de que el modelo la dibuje.
//
// Módulo PURO (sin imports de servidor): lo usan el executor de tools, el route
// del chat y los componentes de cliente.

import type { Bucket } from '@/lib/zoho-status';

export interface LeadCardRow {
  id: string;
  leadNumber: string | null;
  fullName: string;
  status: string | null;
  bucket: Bucket;
  owner: string | null;
  consultor: string | null;
  createdAt: string | null;
  zohoUrl: string;
  phone: string | null;
  lastNote: { preview: string; createdAt: string | null } | null;
}

export interface ZohoLeadsCard {
  title: string; // "Mi cartera" | "Leads que necesitan seguimiento" | "Cartera de X"
  subtitle: string; // "29 en Asistencia Coordinada sin nota en 24h"
  total: number; // total que cumplió el filtro (puede ser > rows.length)
  rows: LeadCardRow[];
  byBucket?: Record<string, number>;
}

const OPEN = '<zoho_leads>';
const CLOSE = '</zoho_leads>';

export function serializeZohoLeads(card: ZohoLeadsCard): string {
  return `\n${OPEN}${JSON.stringify(card)}${CLOSE}\n`;
}

export function extractZohoLeads(text: string): { cleanText: string; leads: ZohoLeadsCard | null } {
  const re = /<zoho_leads>([\s\S]*?)<\/zoho_leads>/gi;
  let leads: ZohoLeadsCard | null = null;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]) as ZohoLeadsCard;
      if (parsed && Array.isArray(parsed.rows)) leads = parsed;
    } catch {
      /* bloque incompleto/cortado por el stream — se ignora */
    }
  }
  const cleanText = text
    .replace(re, '')
    .replace(/<zoho_leads>[\s\S]*$/i, '')
    .replace(/<\/?zoho_leads>/gi, '')
    .trim();
  return { cleanText, leads };
}

export function stripZohoLeadsForStream(text: string): string {
  return text
    .replace(/<zoho_leads>[\s\S]*?<\/zoho_leads>/gi, '')
    .replace(/<zoho_leads>[\s\S]*$/i, '')
    .trimEnd();
}
