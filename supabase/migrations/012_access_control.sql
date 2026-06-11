-- 012 — Compuerta de acceso (RBAC + aprobación de ingresos)
-- Aplicada en producción vía Supabase MCP el 2026-06-11.
--
-- RESGUARDO CRÍTICO: los usuarios existentes quedan 'active' (no se bloquean).
-- El default se cambia a 'pending' DESPUÉS del backfill, para que solo los
-- usuarios NUEVOS pidan aprobación.

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending','active','rejected','suspended'));
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS zoho_user_id TEXT;   -- mapeo asesor -> Owner de Zoho (Fase 2)
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS approved_by TEXT;    -- email del admin que aprobó
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- A partir de ahora, los usuarios NUEVOS entran como 'pending'
ALTER TABLE public.user_roles ALTER COLUMN status SET DEFAULT 'pending';

-- Ampliar roles permitidos para incluir 'Admin' (conserva Asesor/Líder/Channel/Project M)
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_rol_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_rol_check
  CHECK (rol IN ('Asesor','Líder','Channel','Project M','Admin'));

-- Marcar a los 5 admins como superadmin y asegurarlos activos
UPDATE public.user_roles
  SET is_superadmin = true, status = 'active'
  WHERE lower(user_email) IN (
    'juan.s@windmarhome.com','a.rengifo@windmarhome.com',
    'jesus.castro@windmarhome.com','d.buitrago@windmarhome.com','d.riano@windmarhome.com'
  );

CREATE INDEX IF NOT EXISTS idx_user_roles_status ON public.user_roles(status);
