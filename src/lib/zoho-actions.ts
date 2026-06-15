// ════════════════════════════════════════════════════════════════
// ACCIONES DE ESCRITURA EN ZOHO — confirmación de 1 clic (client-safe)
// ════════════════════════════════════════════════════════════════
// El asesor pide una escritura en lenguaje natural; el agente NO la ejecuta:
// prepara una "acción pendiente" que viaja en el stream dentro de un bloque
// <zoho_action>{json}</zoho_action>. El cliente la pinta como tarjeta de
// confirmación; al dar clic, POST /api/zoho/action la ejecuta de verdad.
//
// Este módulo es PURO (sin imports de servidor): lo usan el executor de tools,
// el route del chat, el endpoint de acción y los componentes de cliente.

export type ZohoActionType = 'nota' | 'estado' | 'seguimiento';

export interface ZohoPendingAction {
  type: ZohoActionType;
  leadId: string;
  leadNumber: string | null;
  fullName: string;
  /** Resumen legible que se muestra en la tarjeta de confirmación. */
  summary: string;
  /** Payload específico según el tipo. */
  nota?: { contenido: string };
  estado?: { nuevoEstado: string };
  seguimiento?: { callDate?: string | null; appointmentAt?: string | null; nota?: string | null };
}

const OPEN = '<zoho_action>';
const CLOSE = '</zoho_action>';

/** Serializa la acción para inyectarla en el stream del chat. */
export function serializeZohoAction(action: ZohoPendingAction): string {
  return `\n${OPEN}${JSON.stringify(action)}${CLOSE}\n`;
}

/**
 * Extrae la acción pendiente del texto del LLM y devuelve el texto limpio.
 * Si hay varias, se queda con la ÚLTIMA válida (igual criterio que quick_replies).
 */
export function extractZohoAction(text: string): { cleanText: string; action: ZohoPendingAction | null } {
  const re = /<zoho_action>([\s\S]*?)<\/zoho_action>/gi;
  let action: ZohoPendingAction | null = null;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]) as ZohoPendingAction;
      if (parsed && parsed.type && parsed.leadId) action = parsed;
    } catch {
      /* bloque incompleto/cortado por el stream — se ignora */
    }
  }
  const cleanText = text
    .replace(re, '')
    .replace(/<zoho_action>[\s\S]*$/i, '') // bloque incompleto al final del stream
    .replace(/<\/?zoho_action>/gi, '')
    .trim();
  return { cleanText, action };
}

/** Oculta el bloque (completo o parcial) durante el stream, sin tocar el resto. */
export function stripZohoActionForStream(text: string): string {
  return text
    .replace(/<zoho_action>[\s\S]*?<\/zoho_action>/gi, '')
    .replace(/<zoho_action>[\s\S]*$/i, '')
    .trimEnd();
}

/** Etiqueta corta y emoji por tipo, para la UI. */
export const ACTION_META: Record<ZohoActionType, { label: string; emoji: string }> = {
  nota: { label: 'Agregar nota', emoji: '📝' },
  estado: { label: 'Cambiar estado', emoji: '🏷️' },
  seguimiento: { label: 'Programar seguimiento', emoji: '⏰' },
};
