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

// Los 18 valores oficiales del picklist Lead_Status (verificados en vivo
// 2026-06-15). Usado para validar el cambio de estado que hace el asesor — Zoho
// rechaza un valor fuera del picklist, así que validamos ANTES de escribir.
export const VALID_LEAD_STATUSES: string[] = Object.keys(STATUS_TO_BUCKET).filter((s) => s !== '-None-');

/**
 * Resuelve un texto libre del asesor ("no contesta", "cita", "vendido") al valor
 * EXACTO del picklist de Zoho. Match por igualdad normalizada y luego por
 * inclusión. Devuelve null si es ambiguo o no matchea.
 */
export function resolveLeadStatus(input: string): string | null {
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const q = norm(input);
  if (!q) return null;
  // 1) Igualdad exacta normalizada
  const exact = VALID_LEAD_STATUSES.find((s) => norm(s) === q);
  if (exact) return exact;
  // 2) El picklist contiene la query (ej. "cita coordinada" → "Cita Coordinada")
  const contains = VALID_LEAD_STATUSES.filter((s) => norm(s).includes(q));
  if (contains.length === 1) return contains[0];
  // 3) La query contiene el picklist (ej. "marcalo como no contesta ya")
  const within = VALID_LEAD_STATUSES.filter((s) => q.includes(norm(s)));
  if (within.length === 1) return within[0];
  return null;
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

// ════════════════════════════════════════
// MAPA DE STAGES DE DEALS (Stage) → ESTADO de la cotización
// ════════════════════════════════════════
// Los valores reales del picklist Stage del módulo Deals de la org PR
// (699641359), verificados en vivo el 2026-06-12 sobre los 200 deals más
// recientes. La org NO usa "Closed Won"/"Closed Lost" — usa stages de
// fulfillment solar/roofing. Esto corrige el bug donde sistemaComprado salía
// SIEMPRE "Sin compras cerradas" y dealsAbiertos contaba todo como abierto.
//
// REGLA DE NEGOCIO (confirmada con el usuario el 2026-06-12):
// En Windmar, EXISTIR un Deal significa que el contrato YA está firmado = venta
// cerrada. Les pagan a la PRIMERA firma de documentos y en ese momento el lead
// pasa a "Caso Vendido". Por eso TODAS las etapas del Deal son fulfillment de
// una venta ya hecha (no pipeline abierto). Solo 'Cancelled' es pérdida.
//   - 'ganado'  = contrato firmado (cualquier etapa del deal salvo cancelado).
//   - 'perdido' = cancelado.
//   - 'abierto' = se conserva por compat, pero en esta org casi no aplica.
// (Se hará editable en la Fase 2 vía tabla `zoho_deal_stage_map`.)
export type DealState = 'ganado' | 'abierto' | 'perdido';

const DEAL_STAGE_TO_STATE: Record<string, DealState> = {
  'New Deal': 'ganado',
  'Site Survey': 'ganado',
  'Design/Engineering': 'ganado',
  'Ready to Install': 'ganado',
  'Installation Scheduled': 'ganado',
  'Ready for Roof Prep': 'ganado',
  'Roof Preparation': 'ganado',
  'Roof Sealing': 'ganado',
  'In Service': 'ganado',
  'In Service - Complete': 'ganado',
  'Cancelled': 'perdido',
};

/** Stage (texto Zoho) → estado. Un Deal existe = firmado, así que default 'ganado'. */
export function dealStateOf(stage: string | null | undefined): DealState {
  if (!stage) return 'ganado';
  return DEAL_STAGE_TO_STATE[stage] ?? 'ganado';
}

// Etapas donde el sistema ya está energizado / la postventa está cerrada.
// Sirve para distinguir "vendido y completado" de "vendido, en instalación".
const DEAL_COMPLETED = new Set<string>(['In Service', 'In Service - Complete']);

/** ¿El deal ya está completado/en servicio (vs. firmado pero en proceso)? */
export function isDealCompleted(stage: string | null | undefined): boolean {
  return !!stage && DEAL_COMPLETED.has(stage);
}
