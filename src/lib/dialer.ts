// ════════════════════════════════════════════════════════════════
// MARCADOR (click-to-call) — 3CX y Kixie, botones independientes
// ════════════════════════════════════════════════════════════════
// El asesor elige con qué softphone llamar. Cada proveedor usa su propio
// esquema de URI para que el clic abra el programa CORRECTO (y no compitan
// por el handler de tel:):
//   - 3CX   → callto:  (esquema que registra el cliente de escritorio de 3CX)
//   - Kixie → tel:     (la extensión de Chrome de Kixie intercepta tel:)
// Si en alguna máquina un esquema no dispara el programa esperado, se ajusta
// aquí en un solo punto.

export type DialerProvider = '3cx' | 'kixie';

/**
 * Normaliza un teléfono de PR a formato marcable E.164.
 * "(787) 555-1234" → "+17875551234". Agrega +1 si son 10 dígitos (PR/US).
 * Devuelve null si no parece un número válido.
 */
export function normalizeForDial(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return digits.startsWith('+') ? digits : `+${digits}`;
}

/**
 * Construye el href de marcación para un proveedor específico.
 * Devuelve null si el teléfono no es válido.
 */
export function callHref(phone: string | null | undefined, provider: DialerProvider): string | null {
  const n = normalizeForDial(phone);
  if (!n) return null;
  return provider === '3cx' ? `callto:${n}` : `tel:${n}`;
}
