-- ============================================================
-- Migración 008: el filtro de periodo aplica a TODO el dashboard
-- ============================================================
-- Antes: admin_recent_conversations, admin_recent_downvotes y
-- admin_usage_by_day ignoraban el period del filtro. Eso causaba
-- inconsistencia: KPIs decían "Hoy" pero las conversaciones de
-- abajo seguían siendo todas las históricas.
--
-- Ahora las 3 funciones aceptan `period text` y filtran su query
-- usando admin_period_start(period).
--
-- Ejecutar en: Supabase Dashboard > SQL Editor

-- ────────────── admin_recent_conversations ──────────────
DROP FUNCTION IF EXISTS public.admin_recent_conversations(integer);
DROP FUNCTION IF EXISTS public.admin_recent_conversations(text, integer);

CREATE OR REPLACE FUNCTION public.admin_recent_conversations(
  period text DEFAULT 'all',
  max_rows integer DEFAULT 30
)
RETURNS TABLE (
  conv_id uuid,
  user_email text,
  display_name text,
  departamento text,
  rol text,
  title text,
  total_messages int,
  first_user_message text,
  last_message_at timestamptz,
  created_at timestamptz,
  is_deleted boolean,
  deleted_at timestamptz
)
LANGUAGE plpgsql AS $$
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
$$;

-- ────────────── admin_recent_downvotes ──────────────
DROP FUNCTION IF EXISTS public.admin_recent_downvotes(integer);
DROP FUNCTION IF EXISTS public.admin_recent_downvotes(text, integer);

CREATE OR REPLACE FUNCTION public.admin_recent_downvotes(
  period text DEFAULT 'all',
  max_rows integer DEFAULT 20
)
RETURNS TABLE (
  feedback_id uuid,
  user_email text,
  display_name text,
  message_excerpt text,
  reason text,
  created_at timestamptz
)
LANGUAGE plpgsql AS $$
DECLARE
  start_ts timestamptz := admin_period_start(period);
BEGIN
  RETURN QUERY
  SELECT
    mf.id AS feedback_id,
    mf.user_email::TEXT,
    ur.display_name::TEXT,
    LEFT(mf.message_content, 200)::TEXT AS message_excerpt,
    mf.reason::TEXT,
    mf.created_at
  FROM message_feedback mf
  LEFT JOIN user_roles ur ON ur.user_email = mf.user_email
  WHERE mf.rating = 'down'
    AND mf.created_at >= start_ts
  ORDER BY mf.created_at DESC
  LIMIT max_rows;
END;
$$;

-- ────────────── admin_usage_by_day ──────────────
-- Ahora respeta el periodo: today/week/month/all generan rangos distintos
DROP FUNCTION IF EXISTS public.admin_usage_by_day();
DROP FUNCTION IF EXISTS public.admin_usage_by_day(text);

CREATE OR REPLACE FUNCTION public.admin_usage_by_day(
  period text DEFAULT 'week'
)
RETURNS TABLE (day_label text, messages_count int)
LANGUAGE plpgsql AS $$
DECLARE
  num_days int;
BEGIN
  num_days := CASE period
    WHEN 'today' THEN 1
    WHEN 'week'  THEN 7
    WHEN 'month' THEN 30
    ELSE 90
  END;

  RETURN QUERY
  WITH days AS (
    SELECT date_trunc('day', NOW() - (i * INTERVAL '1 day')) AS d
    FROM generate_series(num_days - 1, 0, -1) AS i
  )
  SELECT
    CASE
      WHEN num_days = 1 THEN to_char(d.d, 'HH24:00')
      WHEN num_days <= 7 THEN to_char(d.d, 'Dy DD')
      WHEN num_days <= 30 THEN to_char(d.d, 'DD Mon')
      ELSE to_char(d.d, 'DD/MM')
    END AS day_label,
    COALESCE(COUNT(m.id)::INT, 0) AS messages_count
  FROM days d
  LEFT JOIN messages m
    ON date_trunc('day', m.created_at) = d.d
    AND m.role = 'user'
  GROUP BY d.d
  ORDER BY d.d;
END;
$$;
