-- ════════════════════════════════════════════════════════════════
-- 016 — RPC de salud de Zoho para /admin/zoho
-- Aplicada en prod (psyfmkmlmvrijdxsirph) el 2026-06-12.
-- ════════════════════════════════════════════════════════════════
create or replace function public.admin_zoho_health(p_days int default 7)
returns json
language sql
as $$
  with recent as (
    select * from public.zoho_query_log
    where created_at >= now() - make_interval(days => p_days)
  )
  select json_build_object(
    'days', p_days,
    'total', (select count(*) from recent),
    'errors', (select count(*) from recent where not ok),
    'errorRatePct', (select case when count(*)=0 then 0
                       else round(100.0 * sum((not ok)::int) / count(*), 1) end from recent),
    'avgMs',  (select coalesce(round(avg(duration_ms)),0) from recent),
    'p50Ms',  (select coalesce(round(percentile_cont(0.5) within group (order by duration_ms)),0) from recent),
    'p95Ms',  (select coalesce(round(percentile_cont(0.95) within group (order by duration_ms)),0) from recent),
    'byTool', (select coalesce(json_agg(t),'[]'::json) from (
        select tool, count(*) as calls, sum((not ok)::int) as errors,
               coalesce(round(avg(duration_ms)),0) as avg_ms
        from recent group by tool order by count(*) desc
      ) t),
    'byDay', (select coalesce(json_agg(d),'[]'::json) from (
        select to_char(date_trunc('day', created_at),'YYYY-MM-DD') as day,
               count(*) as calls, sum((not ok)::int) as errors
        from recent group by 1 order by 1
      ) d),
    'recentErrors', (select coalesce(json_agg(e),'[]'::json) from (
        select to_char(created_at,'YYYY-MM-DD HH24:MI') as at, tool, error, user_email
        from recent where not ok order by created_at desc limit 10
      ) e)
  );
$$;
