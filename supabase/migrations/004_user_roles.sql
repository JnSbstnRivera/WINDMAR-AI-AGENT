-- ============================================================
-- WINDMAR AI AGENT — Migración 004: tabla user_roles
-- Reemplaza el almacenamiento de display_name/departamento/rol
-- que antes vivía en auth.users.user_metadata.
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  user_email      TEXT NOT NULL UNIQUE,
  display_name    TEXT,
  departamento    TEXT CHECK (departamento IS NULL OR departamento IN ('Telemercadeo', 'Ventas', 'Vass', 'Calidad')),
  rol             TEXT NOT NULL DEFAULT 'Asesor' CHECK (rol IN ('Asesor', 'Líder', 'Channel', 'Project M')),
  assigned_by     TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_roles_email ON public.user_roles(user_email);
CREATE INDEX IF NOT EXISTS idx_user_roles_rol ON public.user_roles(rol);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_user_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_roles_updated_at ON public.user_roles;
CREATE TRIGGER user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION update_user_roles_updated_at();

-- ============================================================
-- BACKFILL: copiar datos existentes desde auth.users.user_metadata
-- (Solo aplica si ya hay asesores registrados en el sistema viejo)
-- ============================================================
INSERT INTO public.user_roles (user_email, display_name, departamento, rol, assigned_by)
SELECT
  LOWER(email),
  raw_user_meta_data->>'display_name',
  raw_user_meta_data->>'departamento',
  COALESCE(raw_user_meta_data->>'rol', 'Asesor'),
  'migration-004'
FROM auth.users
WHERE email IS NOT NULL
ON CONFLICT (user_email) DO NOTHING;

-- ============================================================
-- RLS — La tabla user_roles solo se accede via service_role
-- (NextAuth no usa Supabase Auth, así que auth.uid() no aplica)
-- ============================================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Sin políticas explícitas → service_role bypassa, anon/authenticated NO acceden.
-- Esto es lo correcto: solo el backend puede leer/escribir esta tabla.
