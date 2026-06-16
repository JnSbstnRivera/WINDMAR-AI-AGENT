// ════════════════════════════════════════════════════════════════
// CONFIG DE ZOHO DESDE SUPABASE (server-only) + telemetría
// ════════════════════════════════════════════════════════════════
// Carga los mapeos editables (Lead_Status → bucket, Deal Stage → estado) desde
// las tablas `zoho_status_map` / `zoho_deal_stage_map`, cacheados ~5 min, y
// hace MERGE sobre los defaults del código (`zoho-status.ts`).
//
// Garantía de robustez: si la tabla está vacía o Supabase falla, se usan los
// defaults del código — el chat NUNCA se rompe por un problema de config.
//
// IMPORTANTE: este módulo es SERVER-ONLY (usa el service_role). No lo importes
// desde componentes de cliente — para labels/tipos en el cliente, usa
// `zoho-status.ts`, que es puro.

import { getSupabaseAdmin } from '@/lib/supabase';
import {
  bucketOf as defaultBucketOf,
  dealStateOf as defaultDealStateOf,
  isDealCompleted as defaultIsDealCompleted,
  type Bucket,
  type DealState,
} from '@/lib/zoho-status';

const TTL_MS = 5 * 60 * 1000;

// Default curado si la tabla está vacía o Supabase falla.
const DEFAULT_TIPIFICAR = [
  'No Contesta', 'Llamar Despues', 'Cita Coordinada', 'Cita Realizada',
  'Caso Vendido', 'Seguimiento Requerido', 'DQ o No le Interesa',
];

type Cache = {
  statusToBucket: Record<string, string>;
  stageToState: Record<string, DealState>;
  stageCompleted: Record<string, boolean>;
  tipificar: string[];
  loadedAt: number;
};

let cache: Cache | null = null;

async function load(): Promise<Cache> {
  if (cache && Date.now() - cache.loadedAt < TTL_MS) return cache;
  const fresh: Cache = { statusToBucket: {}, stageToState: {}, stageCompleted: {}, tipificar: [], loadedAt: Date.now() };
  try {
    const sb = getSupabaseAdmin();
    const [s, d, t] = await Promise.all([
      sb.from('zoho_status_map').select('status,bucket'),
      sb.from('zoho_deal_stage_map').select('stage,state,completed'),
      sb.from('zoho_tipificar_opciones').select('status,orden,activo').order('orden'),
    ]);
    for (const r of (s.data ?? []) as Array<{ status: string; bucket: string }>) {
      fresh.statusToBucket[r.status] = r.bucket;
    }
    for (const r of (d.data ?? []) as Array<{ stage: string; state: DealState; completed: boolean }>) {
      fresh.stageToState[r.stage] = r.state;
      fresh.stageCompleted[r.stage] = r.completed;
    }
    fresh.tipificar = ((t.data ?? []) as Array<{ status: string; activo: boolean }>)
      .filter((r) => r.activo)
      .map((r) => r.status);
  } catch (err) {
    // Fallback silencioso: cache vacío → todo cae a los defaults del código.
    console.error('[zoho-config] no se pudo cargar config de Supabase, usando defaults:', err instanceof Error ? err.message : err);
  }
  cache = fresh;
  return fresh;
}

export interface ZohoMaps {
  bucketOf: (status: string | null | undefined) => Bucket;
  dealStateOf: (stage: string | null | undefined) => DealState;
  isDealCompleted: (stage: string | null | undefined) => boolean;
}

/**
 * Devuelve resolvers que consultan PRIMERO los overrides de la DB y caen a los
 * defaults del código. Llama una vez por operación de alto nivel y reusa los
 * resolvers de forma síncrona al mapear muchas filas.
 */
export async function getZohoMaps(): Promise<ZohoMaps> {
  const m = await load();
  return {
    bucketOf: (status) =>
      status && m.statusToBucket[status] ? (m.statusToBucket[status] as Bucket) : defaultBucketOf(status),
    dealStateOf: (stage) =>
      stage && m.stageToState[stage] ? m.stageToState[stage] : defaultDealStateOf(stage),
    isDealCompleted: (stage) =>
      stage && stage in m.stageCompleted ? m.stageCompleted[stage] : defaultIsDealCompleted(stage),
  };
}

/** Invalida el cache (llamar tras editar los mapeos en /admin/zoho). */
export function invalidateZohoMapsCache(): void {
  cache = null;
}

/**
 * Estados que aparecen en el dropdown del cuadro de tipificación (editable en
 * /admin/zoho). Si la tabla está vacía o falla, devuelve el default curado.
 */
export async function getTipificarOptions(): Promise<string[]> {
  const m = await load();
  return m.tipificar.length ? m.tipificar : DEFAULT_TIPIFICAR;
}

// ════════════════════════════════════════════════════════════════
// TELEMETRÍA — log de operaciones de Zoho para el dashboard de salud
// ════════════════════════════════════════════════════════════════

export interface ZohoQueryLog {
  tool: string;
  ok: boolean;
  durationMs: number;
  statusCode?: number | null;
  error?: string | null;
  userEmail?: string | null;
  path?: string | null;
}

/**
 * Registra una operación de Zoho (best-effort, fire-and-forget). NO lanza ni
 * bloquea: si el insert falla, se ignora — la telemetría jamás debe tumbar una
 * respuesta al asesor.
 */
export function logZohoQuery(entry: ZohoQueryLog): void {
  try {
    const sb = getSupabaseAdmin();
    void sb
      .from('zoho_query_log')
      .insert({
        tool: entry.tool,
        path: entry.path ?? null,
        ok: entry.ok,
        status_code: entry.statusCode ?? null,
        duration_ms: Math.round(entry.durationMs),
        error: entry.error ? entry.error.slice(0, 500) : null,
        user_email: entry.userEmail ?? null,
      })
      .then(({ error }) => {
        if (error) console.error('[zoho-config] log insert fallo:', error.message);
      });
  } catch {
    // Ignorado a propósito — telemetría best-effort.
  }
}
