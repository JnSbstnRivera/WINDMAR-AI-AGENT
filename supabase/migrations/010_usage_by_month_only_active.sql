-- ============================================================
-- Migración 010: admin_usage_by_day — vista 'all' SOLO meses activos
-- ============================================================
-- Antes (008/009): 'all' generaba 12 meses fijos del último año.
--                  Como el agente arrancó hace pocos meses, el chart
--                  mostraba 11 meses en cero — feo y engañoso.
-- Ahora:           'all' agrupa directamente desde messages — solo
--                  aparecen los meses que SÍ tuvieron actividad.
--                  Chart limpio, refleja la historia real.
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
  -- 'all' → vista mensual SOLO meses con actividad real
  IF period = 'all' THEN
    RETURN QUERY
    SELECT
      to_char(date_trunc('month', m.created_at), 'TMMon YY') AS day_label,
      COUNT(*)::INT AS messages_count
    FROM messages m
    WHERE m.role = 'user'
    GROUP BY date_trunc('month', m.created_at)
    ORDER BY date_trunc('month', m.created_at);
    RETURN;
  END IF;

  -- Casos diarios: today/week/month (mantienen días en cero
  -- porque la línea de tendencia importa)
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
