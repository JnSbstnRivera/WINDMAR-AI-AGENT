-- Plantillas de tipificación afinadas con el modelo de NOTAS-VENTAS-VASS
-- (ventas: producto + consultor) y TELEMERCADEO-SEGUIMIENTO (No Contesta /
-- Asistencia Coordinada). Editables luego en /admin/zoho.
insert into public.zoho_tipificar_opciones (status, orden) values ('Asistencia Coordinada', 35)
on conflict (status) do nothing;

update public.zoho_tipificar_opciones set plantilla = case status
  when 'No Contesta'           then '📵 NO CONTESTA — intento #__ (mañana/tarde). Reintentar: __ (otra hora o canal).'
  when 'Llamar Despues'        then '⏰ LLAMAR DESPUÉS — el cliente pidió contacto: __. Motivo: __'
  when 'Cita Coordinada'       then '📅 CITA COORDINADA — fecha/hora: __. Consultor: __. (Confirmar 24h antes.)'
  when 'Cita Realizada'        then '✅ CITA REALIZADA — resultado: __. Próximo paso: __'
  when 'Asistencia Coordinada' then '🤝 ASISTENCIA COORDINADA — apoyo a consultor __. Coordinado para __. Detalle: __'
  when 'Caso Vendido'          then '🎉 VENTA CERRADA — Producto: __ (solar / roofing / agua / Anker). Consultor: __. Método de pago: __ (cash / loan / lease). Detalle: __'
  when 'Seguimiento Requerido' then '📞 SEGUIMIENTO — gestión: __. Próximo paso: __ (fecha).'
  when 'DQ o No le Interesa'   then '❌ NO INTERESADO / DQ — motivo: __. Qué se intentó: __'
  else plantilla end;
