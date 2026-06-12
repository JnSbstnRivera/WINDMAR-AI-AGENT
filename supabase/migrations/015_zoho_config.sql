-- ════════════════════════════════════════════════════════════════
-- 015 — Configuración editable de Zoho + observabilidad
-- WINDMAR-AI-AGENT. Tablas nuevas en public, prefijo zoho_. No toca nada existente.
-- Aplicada en prod (proyecto Agente Windmar, psyfmkmlmvrijdxsirph) el 2026-06-12.
-- ════════════════════════════════════════════════════════════════

-- 2.1a Mapeo Lead_Status (texto exacto de Zoho) -> bucket de seguimiento.
create table if not exists public.zoho_status_map (
  status      text primary key,
  bucket      text not null check (bucket in
    ('nuevo','seguimiento','frio','cita_pendiente','cita_realizada','vendido','descartado','sin_estado')),
  sort        int  not null default 100,
  updated_at  timestamptz not null default now(),
  updated_by  text
);
comment on table public.zoho_status_map is
  'Mapeo Lead_Status de Zoho -> bucket de seguimiento del agente. Editable en /admin/zoho; el codigo usa sus defaults si esta vacia.';
alter table public.zoho_status_map enable row level security;

-- 2.1b Mapeo Deal Stage -> estado de venta (ganado/abierto/perdido) + completado.
create table if not exists public.zoho_deal_stage_map (
  stage       text primary key,
  state       text not null check (state in ('ganado','abierto','perdido')),
  completed   boolean not null default false,
  sort        int not null default 100,
  updated_at  timestamptz not null default now(),
  updated_by  text
);
comment on table public.zoho_deal_stage_map is
  'Mapeo Stage del modulo Deals -> estado de venta. En Windmar un Deal = contrato firmado; solo Cancelled es perdida. completed=true si el sistema ya esta energizado.';
alter table public.zoho_deal_stage_map enable row level security;

-- 2.2 Log de consultas a Zoho — dashboard de salud (latencia/errores).
create table if not exists public.zoho_query_log (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  tool        text,
  path        text,
  ok          boolean not null,
  status_code int,
  duration_ms int,
  error       text,
  user_email  text
);
comment on table public.zoho_query_log is
  'Telemetria de llamadas a Zoho CRM (latencia, status, errores). Alimenta /admin/zoho. Retencion sugerida: purgar > 30 dias via cron.';
alter table public.zoho_query_log enable row level security;
create index if not exists zoho_query_log_created_idx on public.zoho_query_log (created_at desc);
create index if not exists zoho_query_log_tool_idx on public.zoho_query_log (tool, created_at desc);

-- ── Seeds: valores actuales del codigo (idempotente) ──
insert into public.zoho_status_map (status, bucket, sort) values
  ('Nuevo Lead','nuevo',10),
  ('Lead Nuevo / Cliente Existente','nuevo',11),
  ('Lead Nuevo / Cliente Trabajado','nuevo',12),
  ('No Contesta','seguimiento',20),
  ('Llamar Despues','seguimiento',21),
  ('Seguimiento Requerido','seguimiento',22),
  ('Lead Frio','frio',30),
  ('Cita Coordinada','cita_pendiente',40),
  ('Cita en Espera','cita_pendiente',41),
  ('Asistencia Coordinada','cita_pendiente',42),
  ('Cita Realizada','cita_realizada',50),
  ('Cita No Aprobada','cita_realizada',51),
  ('Caso Vendido','vendido',60),
  ('DQ o No le Interesa','descartado',70),
  ('Credit Fail','descartado',71),
  ('Junk Lead','descartado',72),
  ('No Llamar - Por Consultor','descartado',73),
  ('-None-','sin_estado',99)
on conflict (status) do nothing;

insert into public.zoho_deal_stage_map (stage, state, completed, sort) values
  ('New Deal','ganado',false,10),
  ('Site Survey','ganado',false,20),
  ('Design/Engineering','ganado',false,30),
  ('Ready to Install','ganado',false,40),
  ('Installation Scheduled','ganado',false,50),
  ('Ready for Roof Prep','ganado',false,60),
  ('Roof Preparation','ganado',false,61),
  ('Roof Sealing','ganado',false,62),
  ('In Service','ganado',true,70),
  ('In Service - Complete','ganado',true,80),
  ('Cancelled','perdido',false,90)
on conflict (stage) do nothing;
