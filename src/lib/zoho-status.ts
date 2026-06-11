// ════════════════════════════════════════
// MAPA DE ESTADOS DE PR (Lead_Status) → BUCKETS de seguimiento
// ════════════════════════════════════════
// Los 18 valores reales del picklist Lead_Status de la org de PR (699641359),
// leídos en vivo vía settings.fields el 2026-06-11. Se agrupan en buckets para
// el triage ("¿cuáles necesitan seguimiento?").
//
// Refinamiento futuro (blueprint Florida): mover este mapa a una tabla
// `zoho_status_map` editable desde el admin. Por ahora es un const tipado —
// estable y sin dependencia de DB.

export type Bucket =
  | 'nuevo'
  | 'seguimiento'
  | 'frio'
  | 'cita_pendiente'
  | 'cita_realizada'
  | 'vendido'
  | 'descartado'
  | 'sin_estado';

const STATUS_TO_BUCKET: Record<string, Bucket> = {
  'Nuevo Lead': 'nuevo',
  'Lead Nuevo / Cliente Existente': 'nuevo',
  'Lead Nuevo / Cliente Trabajado': 'nuevo',
  'No Contesta': 'seguimiento',
  'Llamar Despues': 'seguimiento',
  'Seguimiento Requerido': 'seguimiento',
  'Lead Frio': 'frio',
  'Cita Coordinada': 'cita_pendiente',
  'Cita en Espera': 'cita_pendiente',
  'Asistencia Coordinada': 'cita_pendiente',
  'Cita Realizada': 'cita_realizada',
  'Cita No Aprobada': 'cita_realizada',
  'Caso Vendido': 'vendido',
  'DQ o No le Interesa': 'descartado',
  'Credit Fail': 'descartado',
  'Junk Lead': 'descartado',
  'No Llamar - Por Consultor': 'descartado',
  '-None-': 'sin_estado',
};

/** Estado (texto Zoho) → bucket. Desconocido = 'seguimiento' (lado seguro). */
export function bucketOf(status: string | null | undefined): Bucket {
  if (!status) return 'sin_estado';
  return STATUS_TO_BUCKET[status] ?? 'seguimiento';
}

// Buckets "accionables": leads donde el asesor debería estar trabajando.
// Se excluyen vendido / descartado / frío / sin estado del triage por defecto.
const ACTIONABLE = new Set<Bucket>(['nuevo', 'seguimiento', 'cita_pendiente', 'cita_realizada']);

export function isActionable(bucket: Bucket): boolean {
  return ACTIONABLE.has(bucket);
}

export const BUCKET_LABEL: Record<Bucket, string> = {
  nuevo: 'Nuevo',
  seguimiento: 'Seguimiento',
  frio: 'Frío',
  cita_pendiente: 'Cita pendiente',
  cita_realizada: 'Cita realizada',
  vendido: 'Vendido',
  descartado: 'Descartado',
  sin_estado: 'Sin estado',
};
