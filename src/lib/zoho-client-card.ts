// ════════════════════════════════════════════════════════════════
// TARJETA DE CLIENTE — datos estructurados (client-safe)
// ════════════════════════════════════════════════════════════════
// Igual que la lista de leads: buscar_cliente ya NO devuelve texto para que el
// modelo lo redacte (riesgo de que parafrasee/invente). Devuelve datos
// estructurados en <zoho_client>{json}</zoho_client> y el cliente los pinta con
// ClientCardChat — siempre, con enlaces y Lead# reales de Zoho.

import type { Bucket } from '@/lib/zoho-status';

export interface ClientDeal {
  name: string;
  stage: string | null;
  amount: string | null;
  zohoUrl: string;
}

export interface ZohoClientCard {
  kind: 'lead' | 'convertido';
  fullName: string;
  leadId: string | null;       // null si es cliente convertido (sin lead)
  leadNumber: string | null;
  status: string | null;
  bucket: Bucket | null;
  email: string | null;
  phone: string | null;
  owner: string | null;
  consultor: string | null;
  zohoUrl: string;
  sistemaComprado: string;
  totalDeals: number;
  dealsAbiertos: number;
  deals: ClientDeal[];
  /** Estados + plantilla para el cuadro de tipificación (editables en /admin/zoho). */
  tipificarOptions?: TipificarOpt[];
}

/** Opción del dropdown de tipificación: estado + plantilla de nota opcional. */
export interface TipificarOpt { status: string; plantilla?: string | null }

const OPEN = '<zoho_client>';
const CLOSE = '</zoho_client>';

export function serializeZohoClient(card: ZohoClientCard): string {
  return `\n${OPEN}${JSON.stringify(card)}${CLOSE}\n`;
}

export function extractZohoClient(text: string): { cleanText: string; client: ZohoClientCard | null } {
  const re = /<zoho_client>([\s\S]*?)<\/zoho_client>/gi;
  let client: ZohoClientCard | null = null;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]) as ZohoClientCard;
      if (parsed && parsed.fullName) client = parsed;
    } catch {
      /* bloque incompleto/cortado por el stream — se ignora */
    }
  }
  const cleanText = text
    .replace(re, '')
    .replace(/<zoho_client>[\s\S]*$/i, '')
    .replace(/<\/?zoho_client>/gi, '')
    .trim();
  return { cleanText, client };
}

export function stripZohoClientForStream(text: string): string {
  return text
    .replace(/<zoho_client>[\s\S]*?<\/zoho_client>/gi, '')
    .replace(/<zoho_client>[\s\S]*$/i, '')
    .trimEnd();
}
