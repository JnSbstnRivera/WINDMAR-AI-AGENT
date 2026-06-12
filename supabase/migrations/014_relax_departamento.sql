-- 014_relax_departamento.sql
-- Permite áreas de texto libre en user_roles.departamento.
--
-- Contexto: el alta manual de usuarios (/admin/usuarios → "Agregar usuario") y
-- el OnboardingModal ofrecen la opción "Otro" con un campo de texto libre para
-- áreas fuera del call center (ej. RH, Florida, Energy). El CHECK original
-- limitaba departamento a {Telemercadeo, Ventas, Vass, Calidad} y rechazaba esos
-- valores, rompiendo el alta con error 500 "No se pudo crear el usuario".
--
-- Se elimina la restricción. La columna sigue siendo TEXT y admite NULL.
-- Reversible: re-crear el CHECK si se quisiera volver a acotar las áreas.

ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_departamento_check;
