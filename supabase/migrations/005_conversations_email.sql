-- ============================================================
-- WINDMAR AI AGENT — Migración 005: conversations por email
-- Cambia conversations.user_id (UUID) → conversations.user_email (TEXT)
-- Razón: NextAuth no comparte UUIDs con Supabase Auth.
-- Ejecutar en: Supabase Dashboard > SQL Editor — DESPUÉS de 004
-- ============================================================

-- 1. Agregar columna user_email
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS user_email TEXT;

-- 2. Backfill: mapear user_id existentes a sus emails
UPDATE public.conversations c
SET user_email = LOWER(u.email)
FROM auth.users u
WHERE c.user_id = u.id AND c.user_email IS NULL;

-- 3. Índice para búsquedas rápidas por email
CREATE INDEX IF NOT EXISTS idx_conversations_user_email ON public.conversations(user_email);

-- 4. Hacer user_email NOT NULL (después del backfill)
-- IMPORTANTE: si hay rows con user_email NULL después del backfill (orfanas),
-- hay que limpiarlas o asignarlas antes de aplicar esto.
-- Comentado por defecto — ejecutar manualmente cuando se confirme:
-- ALTER TABLE public.conversations ALTER COLUMN user_email SET NOT NULL;

-- 5. Eliminar políticas RLS viejas (que dependían de user_id)
DROP POLICY IF EXISTS "Asesor ve sus conversaciones" ON public.conversations;
DROP POLICY IF EXISTS "Asesor crea sus conversaciones" ON public.conversations;
DROP POLICY IF EXISTS "Asesor actualiza sus conversaciones" ON public.conversations;
DROP POLICY IF EXISTS "Asesor borra sus conversaciones" ON public.conversations;
DROP POLICY IF EXISTS "Asesor ve mensajes de sus conversaciones" ON public.messages;
DROP POLICY IF EXISTS "Asesor inserta mensajes en sus conversaciones" ON public.messages;

-- 6. Sin políticas RLS → solo service_role accede (que es lo que usa el backend)
-- RLS sigue habilitado, pero sin políticas = bloquea anon/authenticated y permite service_role.

-- 7. Eliminar la columna user_id (OPCIONAL — comentado por seguridad)
-- Hasta confirmar que todo funciona, mantener user_id como respaldo.
-- Cuando todo esté validado en producción, ejecutar manualmente:
-- ALTER TABLE public.conversations DROP COLUMN user_id;
