// ════════════════════════════════════════════════════════════════
// MARCADOR (click-to-call) — 3CX hoy, Kixie cuando migren
// ════════════════════════════════════════════════════════════════
// El asesor toca "Llamar" en un lead y se lanza la llamada en su softphone.
// Usamos enlaces `tel:` estándar: el cliente de escritorio de 3CX y la
// extensión de Chrome de Kixie los interceptan igual. Cuando se complete la
// migración a Kixie y se quiera su click-to-call propio, basta cambiar
// PROVIDER aquí (un solo punto) — el resto del código no se toca.

type DialerProvider = '3cx' | 'kixie';

// Proveedor activo. Migración a Kixie = cambiar a 'kixie'.
const PROVIDER: DialerProvider = '3cx';

/**
 * Normaliza un teléfono de PR a formato marcable.
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
 * Construye el href de marcación para el proveedor activo.
 * Devuelve null si el teléfono no es válido.
 */
export function buildCallHref(phone: string | null | undefined): string | null {
  const n = normalizeForDial(phone);
  if (!n) return null;
  switch (PROVIDER) {
    case 'kixie':
      // La extensión de Kixie también captura tel:; si en el futuro se quiere
      // su deep-link propio, se cambia esta línea.
      return `tel:${n}`;
    case '3cx':
    default:
      return `tel:${n}`;
  }
}
