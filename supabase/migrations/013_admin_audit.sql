-- 013 — Auditoría de acciones sensibles (escrituras a Zoho, cambios de acceso)
-- Aplicada en producción vía Supabase MCP el 2026-06-11.
-- Append-only por convención. RLS ON sin políticas = solo service_role (la app).
CREATE TABLE IF NOT EXISTS public.admin_audit (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_email TEXT NOT NULL,          -- quién hizo la acción
  action      TEXT NOT NULL,          -- ej. 'zoho.assign', 'zoho.note', 'access.approve'
  target      TEXT,                   -- ej. lead id / correo afectado
  detail      JSONB                   -- payload extra (cuántos leads, nuevo owner, etc.)
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor ON public.admin_audit(actor_email);

ALTER TABLE public.admin_audit ENABLE ROW LEVEL SECURITY;
