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

// En las máquinas de Windmar, `tel:` lo intercepta el softphone activo (3CX hoy;
// Kixie cuando su extensión esté en Edge). `callto:` lo robaba Microsoft Teams
// (que tiene las llamadas deshabilitadas) → se eliminó. Por eso AMBOS proveedores
// usan `tel:`: el botón llega siempre al teléfono real, nunca a Teams.

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
export function callHref(phone: string | null | undefined, _provider: DialerProvider): string | null {
  const n = normalizeForDial(phone);
  if (!n) return null;
  // Ambos usan tel: (ver nota arriba). El _provider se mantiene solo para la
  // etiqueta/tooltip del botón en la UI.
  return `tel:${n}`;
}
