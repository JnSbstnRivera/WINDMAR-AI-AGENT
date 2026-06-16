-- Opciones de tipificación editables desde /admin/zoho.
-- Controla qué estados de Lead_Status aparecen en el dropdown del cuadro de
-- tipificación del chat. Deben ser valores REALES del picklist oficial de Zoho
-- (el endpoint /api/zoho/action revalida contra VALID_LEAD_STATUSES igual).
create table if not exists public.zoho_tipificar_opciones (
  id uuid primary key default gen_random_uuid(),
  status text not null unique,
  orden int not null default 0,
  activo boolean not null default true,
  created_at timestamptz default now()
);

-- Seed curado (los más usados). El admin puede agregar/quitar/reordenar.
insert into public.zoho_tipificar_opciones (status, orden) values
  ('No Contesta', 1),
  ('Llamar Despues', 2),
  ('Cita Coordinada', 3),
  ('Cita Realizada', 4),
  ('Caso Vendido', 5),
  ('Seguimiento Requerido', 6),
  ('DQ o No le Interesa', 7)
on conflict (status) do nothing;
