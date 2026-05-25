-- ============================================================
-- Migración 009: admin_usage_by_day — agrupa por mes cuando period='all'
-- ============================================================
-- Antes: 'all' devolvía últimos 90 días por día (chart muy denso e
--        ilegible para vista histórica).
-- Ahora:  'all' devuelve últimos 12 meses agrupados por mes (ej. "May 26",
--        "Jun 26", ...) — vista limpia del año completo.
--
-- Ejecutar en: Supabase Dashboard > SQL Editor

CREATE OR REPLACE FUNCTION public.admin_usage_by_day(
  period text DEFAULT 'week'
)
RETURNS TABLE (day_label text, messages_count int)
LANGUAGE plpgsql AS $$
DECLARE
  num_days int;
BEGIN
  -- ── CASO ESPECIAL: 'all' → vista mensual del último año ──
  IF period = 'all' THEN
    RETURN QUERY
    WITH months AS (
      SELECT date_trunc('month', NOW() - (i * INTERVAL '1 month')) AS m
      FROM generate_series(11, 0, -1) AS i
    )
    SELECT
      to_char(m.m, 'TMMon YY') AS day_label,
      COALESCE(COUNT(msg.id)::INT, 0) AS messages_count
    FROM months m
    LEFT JOIN messages msg
      ON date_trunc('month', msg.created_at) = m.m
      AND msg.role = 'user'
    GROUP BY m.m
    ORDER BY m.m;
    RETURN;
  END IF;

  -- ── CASOS DIARIOS: today/week/month ──
  num_days := CASE period
    WHEN 'today' THEN 1
    WHEN 'week'  THEN 7
    WHEN 'month' THEN 30
    ELSE 7
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
      ELSE to_char(d.d, 'DD Mon')
    END AS day_label,
    COALESCE(COUNT(msg.id)::INT, 0) AS messages_count
  FROM days d
  LEFT JOIN messages msg
    ON date_trunc('day', msg.created_at) = d.d
    AND msg.role = 'user'
  GROUP BY d.d
  ORDER BY d.d;
END;
$$;
