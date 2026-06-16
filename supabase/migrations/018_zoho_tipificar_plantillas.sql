-- Plantilla de nota por estado de tipificación (editable en /admin/zoho).
-- Al elegir el estado en el cuadro, el campo de nota se autocompleta con esta
-- plantilla para que el asesor solo ajuste un dato (menos clicks/tecleo).
alter table public.zoho_tipificar_opciones add column if not exists plantilla text;

update public.zoho_tipificar_opciones set plantilla = case status
  when 'No Contesta' then '📵 No contesta. Intento #__ — reintentar: __'
  when 'Llamar Despues' then '⏰ Pidió que lo llamen luego. Cuándo: __'
  when 'Cita Coordinada' then '📅 Cita coordinada para __ con __'
  when 'Cita Realizada' then '✅ Cita realizada. Resultado: __'
  when 'Caso Vendido' then '🎉 Caso vendido. Método de pago: __. Detalle: __'
  when 'Seguimiento Requerido' then '📞 Seguimiento: __. Próximo paso: __'
  when 'DQ o No le Interesa' then '❌ No interesado. Motivo: __'
  else plantilla end
where plantilla is null;
