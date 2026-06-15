// ════════════════════════════════════════════════════════════════
// EXTRACTOR DE <quick_replies> — COMPARTIDO (cliente)
// ════════════════════════════════════════════════════════════════
// Único parser de los chips de coach, usado por el chat principal (ChatApp)
// y el chat de gestión del admin (AdminChat). Antes cada uno tenía su copia y
// divergieron: el admin se quedó con una versión vieja que borraba la tabla de
// leads cuando Haiku emitía un bloque <quick_replies> ANTES de la tabla (el
// loop agéntico puede emitir varios bloques). Centralizado para que no vuelva
// a pasar.

export interface QuickRepliesResult {
  cleanText: string;
  replies: string[];
}

/**
 * Extrae el/los bloque(s) <quick_replies>...</quick_replies> del texto del LLM.
 *
 * - GLOBAL: el loop agéntico puede producir VARIOS bloques (uno antes del tool
 *   call y otro al final). Se quitan TODOS del texto visible y se conservan los
 *   chips del ÚLTIMO bloque con contenido.
 * - Tolera variantes (con/sin guiones, bullets, líneas vacías) y limpia tags
 *   sueltos o incompletos cortados por el stream.
 */
export function extractQuickReplies(text: string): QuickRepliesResult {
  const re = /<quick_replies>\s*([\s\S]*?)\s*<\/quick_replies>/gi;
  let replies: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const parsed = match[1]
      .split('\n')
      .map((l) => l.replace(/^[\s\-*•]+/, '').trim())
      .filter((l) => l.length > 0 && l.length < 100)
      .slice(0, 3);
    if (parsed.length > 0) replies = parsed;
  }
  const cleanText = text
    .replace(re, '')
    .replace(/<quick_replies>[\s\S]*$/i, '') // bloque incompleto (stream cortado)
    .replace(/<\/?quick_replies>/gi, '') // tags sueltos
    .trim();
  return { cleanText, replies };
}

/**
 * Versión para usar DURANTE el stream: solo oculta el texto a partir de un
 * bloque <quick_replies> (completo o no), sin extraer chips todavía. Evita que
 * el usuario vea XML crudo mientras se genera la respuesta.
 */
export function stripQuickRepliesForStream(text: string): string {
  return text
    .replace(/<quick_replies>[\s\S]*?<\/quick_replies>/gi, '')
    .replace(/<quick_replies>[\s\S]*$/i, '')
    .trimEnd();
}
