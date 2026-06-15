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

export type ZohoActionType = 'nota' | 'estado' | 'seguimiento' | 'compound';

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
  /** Solo para 'compound': varios pasos sobre el MISMO lead, un solo confirmar. */
  steps?: ZohoPendingAction[];
}

/** Combina varias acciones del mismo lead en UNA sola acción compuesta. */
export function makeCompoundAction(steps: ZohoPendingAction[]): ZohoPendingAction {
  const first = steps[0];
  return {
    type: 'compound',
    leadId: first.leadId,
    leadNumber: first.leadNumber,
    fullName: first.fullName,
    summary: steps.map((s) => s.summary).join(' · '),
    steps,
  };
}

const OPEN = '<zoho_action>';
const CLOSE = '</zoho_action>';

/** Serializa la acción para inyectarla en el stream del chat. */
export function serializeZohoAction(action: ZohoPendingAction): string {
  return `\n${OPEN}${JSON.stringify(action)}${CLOSE}\n`;
}

/**
 * Extrae TODAS las acciones pendientes del texto del LLM y devuelve el texto
 * limpio. Devuelve un array: un turno puede preparar varias acciones (p. ej.
 * estado + seguimiento, o acciones sobre leads distintos).
 */
export function extractZohoActions(text: string): { cleanText: string; actions: ZohoPendingAction[] } {
  const re = /<zoho_action>([\s\S]*?)<\/zoho_action>/gi;
  const actions: ZohoPendingAction[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]) as ZohoPendingAction;
      if (parsed && parsed.type && parsed.leadId) actions.push(parsed);
    } catch {
      /* bloque incompleto/cortado por el stream — se ignora */
    }
  }
  const cleanText = text
    .replace(re, '')
    .replace(/<zoho_action>[\s\S]*$/i, '') // bloque incompleto al final del stream
    .replace(/<\/?zoho_action>/gi, '')
    .trim();
  return { cleanText, actions };
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
  compound: { label: 'Gestión del lead', emoji: '⚡' },
};
