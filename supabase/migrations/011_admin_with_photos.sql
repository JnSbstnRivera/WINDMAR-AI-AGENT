-- ============================================================
-- Migración 011: photo_url en dashboard admin
-- ============================================================
-- Agrega la foto de perfil de Microsoft 365 (data URI base64) a las
-- funciones admin_top_asesores y admin_recent_conversations, para
-- que el dashboard muestre la foto real en lugar de iniciales.
--
-- Las fotos viven en user_roles.photo_url (se descargan en signIn
-- de Microsoft Graph /me/photo). Tamaños típicos: 30-200KB cada una.
--
-- Ejecutar en: Supabase Dashboard > SQL Editor (o ya aplicada vía MCP)

DROP FUNCTION IF EXISTS public.admin_top_asesores(text, integer);

CREATE OR REPLACE FUNCTION public.admin_top_asesores(
  period text DEFAULT 'week'::text,
  max_rows integer DEFAULT 10
)
RETURNS TABLE(
  asesor_email text,
  display_name text,
  departamento text,
  rol text,
  photo_url text,
  total_messages integer,
  total_convs integer
)
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  start_ts TIMESTAMPTZ;
BEGIN
  start_ts := admin_period_start(period);

  RETURN QUERY
  SELECT
    c.user_email::TEXT AS asesor_email,
    ur.display_name::TEXT,
    ur.departamento::TEXT,
    ur.rol::TEXT,
    ur.photo_url::TEXT,
    COUNT(m.id)::INT AS total_messages,
    COUNT(DISTINCT c.id)::INT AS total_convs
  FROM conversations c
  JOIN messages m ON m.conversation_id = c.id
  LEFT JOIN user_roles ur ON ur.user_email = c.user_email
  WHERE m.role = 'user' AND m.created_at >= start_ts
  GROUP BY c.user_email, ur.display_name, ur.departamento, ur.rol, ur.photo_url
  ORDER BY total_messages DESC
  LIMIT max_rows;
END;
$function$;

DROP FUNCTION IF EXISTS public.admin_recent_conversations(text, integer);

CREATE OR REPLACE FUNCTION public.admin_recent_conversations(
  period text DEFAULT 'all'::text,
  max_rows integer DEFAULT 30
)
RETURNS TABLE(
  conv_id uuid,
  user_email text,
  display_name text,
  departamento text,
  rol text,
  photo_url text,
  title text,
  total_messages integer,
  first_user_message text,
  last_message_at timestamp with time zone,
  created_at timestamp with time zone,
  is_deleted boolean,
  deleted_at timestamp with time zone
)
LANGUAGE plpgsql
AS $function$
DECLARE
  start_ts timestamptz := admin_period_start(period);
BEGIN
  RETURN QUERY
  SELECT
    c.id AS conv_id,
    c.user_email::TEXT,
    ur.display_name::TEXT,
    ur.departamento::TEXT,
    ur.rol::TEXT,
    ur.photo_url::TEXT,
    c.title::TEXT,
    (SELECT COUNT(*)::INT FROM messages m WHERE m.conversation_id = c.id) AS total_messages,
    (SELECT LEFT(m.content, 120) FROM messages m
      WHERE m.conversation_id = c.id AND m.role = 'user'
      ORDER BY m.created_at ASC LIMIT 1)::TEXT AS first_user_message,
    (SELECT MAX(m.created_at) FROM messages m WHERE m.conversation_id = c.id) AS last_message_at,
    c.created_at,
    (c.deleted_at IS NOT NULL) AS is_deleted,
    c.deleted_at
  FROM conversations c
  LEFT JOIN user_roles ur ON ur.user_email = c.user_email
  WHERE c.updated_at >= start_ts
  ORDER BY c.updated_at DESC
  LIMIT max_rows;
END;
$function$;
