-- ============================================================
-- WINDMAR AI AGENT — Migración 007:
--   1. Fix triggers Calculadora Enseres (no matcheaba bien)
--   2. Entrada KB diferencial LUMA Scanner vs Calculadora Enseres
--   3. Nueva categoría CALIDAD_LLAMADA en knowledge_base con
--      la matriz oficial usada por Calidad para TM, Ventas y VASS
--      (15 entradas: resumen + 3 categorías + 8 críticos + 1 no
--      crítico resumen + 3 tiempos específicos por área)
--
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- ────────────── 1. Fix Calculadora Enseres ──────────────
UPDATE public.tools
SET
  triggers = ARRAY[
    'enseres','electrodomesticos','electrodomésticos','calcular enseres',
    'calcular consumo','calcula consumo','calcula el consumo','calcular el consumo',
    'consumo del hogar','consumo electrico','consumo eléctrico','consumo en casa',
    'consumo mensual','consumo aparatos','uso electrico','uso eléctrico',
    'cuanto consume','cuánto consume','cuanto gasta de luz','sin factura','no tiene factura',
    'no tiene bill','no tiene luma','calculadora consumo','calculadora de consumo',
    'dimensionar por enseres','dimensionar consumo','estimar consumo',
    'nevera','lavadora','secadora','horno','microondas','calentador',
    'refrigerador','equipos del hogar','aparatos electrodomesticos','aparatos eléctricos'
  ],
  when_to_use = 'Cliente NO tiene factura de LUMA a la mano y quiere saber consumo eléctrico estimado del hogar. Útil cuando el asesor pregunta "cómo dimensiono sin factura" o "calcular consumo por electrodomésticos". Complementa a LUMA Scanner (que requiere factura).'
WHERE slug = 'calculadora-enseres';

-- ────────────── 2. Entrada diferencial LUMA vs Enseres ──────────────
-- (ON CONFLICT no aplica porque la tabla no tiene UNIQUE en titulo)
-- Si se re-ejecuta, este INSERT crearía duplicados — usar DELETE+INSERT
DELETE FROM public.knowledge_base
WHERE titulo = 'Calculadora Enseres vs LUMA Scanner — cuál usar cuándo';

INSERT INTO public.knowledge_base (categoria, subcategoria, titulo, contenido, area) VALUES
('HERRAMIENTA', 'DIMENSIONAMIENTO',
 'Calculadora Enseres vs LUMA Scanner — cuál usar cuándo',
 'AMBAS herramientas dimensionan el sistema solar del cliente, pero parten de información distinta. Saber cuál usar es clave para no perder tiempo en llamada.

LUMA SCANNER ([usar este enlace](https://luma-scanner-two.vercel.app/)):
- SE USA cuando el cliente TIENE su factura de LUMA a la mano (foto, PDF, dato del monto/kWh).
- Es el camino más rápido y exacto: lee el consumo histórico real del cliente.
- Es el primer paso estándar del proceso solar.

CALCULADORA ENSERES ([usar este enlace](https://calculadora-enseres.vercel.app/)):
- SE USA cuando el cliente NO TIENE factura en la mano, no recuerda lo que paga, o quiere una proyección por electrodomésticos.
- Estima el consumo según los aparatos del hogar (nevera, aires, lavadora, secadora, calentador, microondas, etc.).
- Complemento útil cuando hay aires acondicionados específicos — combinable con Calculadora Placas x Aires.

REGLA PARA EL ASESOR:
1. Primero pregunta: "¿Tienes tu factura de LUMA a la mano?"
   - SÍ → LUMA Scanner.
   - NO → Calculadora Enseres.
2. Si pregunta el cliente "¿cuánto consumo?" sin tener factura → directo a Enseres.
3. Si pregunta "calcular consumo" o "consumo del hogar" o "uso eléctrico" → Enseres.
4. Si menciona aires acondicionados → Calculadora Placas x Aires (complemento).

NO recomendar AMBAS al mismo tiempo a menos que el cliente quiera comparar — pueden generar confusión.',
 'ALL');

-- ────────────── 3. CALIDAD_LLAMADA — 15 entradas ──────────────
-- Resumen + por categoría + items críticos detallados + tiempos por área
DELETE FROM public.knowledge_base WHERE categoria = 'CALIDAD_LLAMADA';

INSERT INTO public.knowledge_base (categoria, subcategoria, titulo, contenido, area) VALUES

('CALIDAD_LLAMADA', 'RESUMEN',
 'Matriz de Calidad — Resumen general (TM, Ventas y VASS)',
 'La matriz de calidad evalúa cada llamada del Call Center con 20 items distribuidos en 3 categorías ponderadas:

CATEGORÍAS (con su peso del total):
- INICIO (30%): claridad, exactitud, validación de comprensión. 5 items.
- ACTITUD COMERCIAL (50%): manejo del cliente, objeciones, tono. 10 items.
- SEGUIMIENTO (20%): documentación, estados, historial en Zoho. 4 items.
- Item extra N/A: Venta o asignación de cita (1 item).

TIPOS DE ITEM:
- CRÍTICO (8 items): afectan fuertemente la calificación cuando se incumplen. Errores aquí son inaceptables.
- NO CRÍTICO (12 items): suman a la nota pero no son rupturas graves.

SISTEMA DE PUNTAJE por item:
- Cumplimiento total = 5 puntos
- Cumplimiento parcial = 3 puntos
- Incumplimiento = 0 puntos
- No aplica = vacío (no suma ni resta)

Puntaje final sobre 100 puntos. Auditoría realizada por equipo de Calidad (Catalina Castro, analista actual).

ÁREAS APLICABLES: misma matriz para Telemercadeo, Ventas y VASS. La única diferencia es el tiempo máximo permitido para retomar al cliente tras una espera: TM = 60 segundos; Ventas y VASS/Consultant = 210 segundos.',
 'ALL'),

('CALIDAD_LLAMADA', 'INICIO',
 'Calidad INICIO 30% — 5 items de claridad y validación',
 'Categoría INICIO (peso 30% del total). Items:

1. SALUDO (NO CRÍTICO): Saluda presentando a WindMar Home (WH). Se dirige al cliente de manera formal. Menciona su nombre y área correspondiente.

2. PRESENTAR SU FUNCIÓN (NO CRÍTICO): Brinda objetivo claro de la llamada (venta, cotización, seguimiento). Garantiza que el cliente entienda el propósito del contacto.

3. PREGUNTAS DE INVESTIGACIÓN (NO CRÍTICO): Realiza preguntas que permitan identificar la necesidad o interés del cliente. Mantiene una secuencia lógica. (Excepción: citas agendadas por consultor TM o contexto previo).

4. DESPEDIDA (NO CRÍTICO): Finaliza agradeciendo el tiempo del cliente. Cierra de manera cordial y profesional, mencionando WH.

5. DESINTERÉS EN ENTREGAR LA OFERTA (CRÍTICO): NO debe sugerir envío de correo sin que el cliente manifieste no poder atender. Si la llamada se finaliza, debe garantizar remarcación mostrando disposición. (Ruidos externos que demuestren desinterés también cuentan).',
 'ALL'),

('CALIDAD_LLAMADA', 'ACTITUD COMERCIAL',
 'Calidad ACTITUD COMERCIAL 50% — 10 items del manejo del cliente',
 'Categoría ACTITUD COMERCIAL (peso 50% del total — la más importante). Items:

CRÍTICOS (3):
1. MALTRATO O REACCIÓN GROSERA (CRÍTICO): NO juzgar ni desestimar al cliente. Demostrar tolerancia ante negativas. PROHIBIDO el uso de términos o palabras soeces.

2. MANEJO DE OBJECIONES (CRÍTICO): Ante una negativa, dar manejo comercial — no cerrar la gestión sin esfuerzo. Los beneficios para rebatir deben ser acordes a lo que el cliente requiere. Escucha la objeción y responde con argumentos claros y orientados a la solución.

3. BRINDA INFORMACIÓN CORRECTA (CRÍTICO): Entrega información precisa, coherente y actualizada sobre el producto. Evita errores o contradicciones que afecten la credibilidad.

NO CRÍTICOS (7):
4. SOLICITA/JUSTIFICA TIEMPOS: Menciona motivo de espera. Agradece al retomar. Tiempo máximo: TM=60 seg, Ventas/VASS=210 seg.
5. ATIENDE OPORTUNAMENTE: Responde llamada en máximo 5 segundos.
6. ESTABLECE ACUERDOS Y COMPROMISOS: Busca una nueva llamada de seguimiento para efectividad de cierre.
7. INDAGA COMERCIALMENTE: Preguntas que permitan tomar ruta comercial, acordes a necesidad/negativa del cliente.
8. PRESENTA POSIBILIDADES PARA CITA/VENTA: Esfuerzo de asignación de cita o venta usando beneficios del producto. Ventas: acompaña entrega de documentos.
9. ESCUCHA ACTIVA: Respuestas coherentes. Evita sobreponer voz. Mantiene concentración pese a factores externos.
10. TONO Y RITMO DE VOZ: Sin muletillas. Sin hablar muy rápido ni muy lento. Buena vocalización. Entonación dinámica que cautive.',
 'ALL'),

('CALIDAD_LLAMADA', 'SEGUIMIENTO',
 'Calidad SEGUIMIENTO 20% — 4 items de documentación y estados',
 'Categoría SEGUIMIENTO (peso 20% del total). Items:

1. DISMINUYE INTENCIONALMENTE RITMO LABORAL (CRÍTICO):
- Se identifica ocupación de canal superior a 1 minuto.
- Cuelgue pasivo (deja al cliente en espera y no retoma).
- Cuelgue intencional (registro en Zoho que el USUARIO finalizó la llamada — no fue el cliente).

2. DOCUMENTA EN ZOHO CRM (NO CRÍTICO): Deja huella clara, completa y correcta de lo sucedido en la llamada. Registra cliente, resultado, observaciones. Sin errores u omisiones.

3. CAMBIA ESTADO CORRECTAMENTE (CRÍTICO): Modifica el estado del cliente o cita de acuerdo con el avance real de la gestión. Evita dejar estados erróneos o desactualizados.

4. REVISIÓN DEL HISTORIAL DE CONTACTOS (CRÍTICO): Consulta la trazabilidad antes de gestionar (deals anteriores). Evita duplicar llamadas o acciones ya realizadas. Garantiza validación de deals anteriores para asignación de consultores.

ÍTEM EXTRA (N/A): VENTA O ASIGNACIÓN DE CITA (NO CRÍTICO):
- Cumplimiento total = se concretó la venta o se agendó cita.
- Incumplimiento = solo se enfocó en UN producto sin brindar opciones.
- No aplica = es un seguimiento, o el cliente no tiene tiempo, o no precalifica.',
 'ALL'),

('CALIDAD_LLAMADA', 'CRITICO',
 'Calidad CRÍTICO — Desinterés en entregar la oferta',
 'Item CRÍTICO de la categoría INICIO. Aplica a TM, Ventas y VASS.

QUÉ DEBE EVITAR EL ASESOR:
- Sugerir enviar la oferta por correo SIN que el cliente manifieste que no puede atender en ese momento.
- Cerrar la gestión sin hacer un esfuerzo comercial por entregar la oferta en línea.
- Permitir que ruidos externos del propio asesor demuestren desinterés (música alta de fondo, conversaciones paralelas).

QUÉ DEBE HACER:
- Si la llamada se finaliza, garantizar remarcación mostrando disposición a entregar la oferta o lograr la venta.
- Si el cliente realmente no puede atender, agendar callback con horario específico.

VALORACIÓN: cumplimiento total = 5 puntos. Incumplimiento = 0 (impacta fuerte en la nota).',
 'ALL'),

('CALIDAD_LLAMADA', 'CRITICO',
 'Calidad CRÍTICO — Maltrato o reacción grosera al cliente',
 'Item CRÍTICO de la categoría ACTITUD COMERCIAL. Aplica a TM, Ventas y VASS.

INACEPTABLE:
- Juzgar o desestimar la información que proporciona el cliente.
- No demostrar tolerancia ante respuestas negativas.
- Usar términos o palabras soeces en la comunicación.
- Tono elevado, respuestas bruscas, lenguaje inapropiado.

QUÉ HACER EN SU LUGAR:
- Muestra empatía incluso ante objeciones o reclamos.
- Mantén tono cordial aunque el cliente sea hostil.
- Si el cliente está alterado, espera turno y responde con calma.

Este item es de los más vigilados por Calidad — un incumplimiento aquí puede invalidar la llamada completa.',
 'ALL'),

('CALIDAD_LLAMADA', 'CRITICO',
 'Calidad CRÍTICO — Manejo de objeciones',
 'Item CRÍTICO de la categoría ACTITUD COMERCIAL. Aplica a TM, Ventas y VASS.

PROHIBIDO:
- Cerrar la gestión ante una negativa sin esfuerzo comercial.
- Presionar o insistir de manera inapropiada.
- Responder con argumentos genéricos que no atacan la objeción real.

OBLIGATORIO:
- Escuchar la objeción completa antes de responder.
- Responder con argumentos claros, orientados a la solución.
- Adaptar la respuesta a la situación específica del cliente.
- Los beneficios que mencione deben ser acordes a lo que el cliente REQUIERE (no a lo que el asesor quiere vender).

Pista para el asesor: usar las entradas de OBJECION_ARGUMENTO del manual antes de responder objeciones comunes (precio, ya tiene panel, no le interesa, etc.).',
 'ALL'),

('CALIDAD_LLAMADA', 'CRITICO',
 'Calidad CRÍTICO — Brinda información correcta al cliente',
 'Item CRÍTICO de la categoría ACTITUD COMERCIAL. Aplica a TM, Ventas y VASS.

QUÉ DEBE ENTREGAR EL ASESOR:
- Información precisa, coherente y actualizada del producto.
- Datos verificables (garantías, plazos, capacidades, modelos exactos).
- Promociones VIGENTES (no las expiradas — siempre validar fecha).

QUÉ NO HACER:
- Inventar precios o plazos.
- Mezclar info de productos distintos (ej: Powerwall 2 vs Powerwall 3 NO son compatibles).
- Asegurar promociones sin confirmar vigencia.
- Contradecirse durante la misma llamada.

Si no estás seguro, consulta al líder o al bot Windmar AI antes de afirmar — es peor dar info incorrecta que pausar 30 segundos.',
 'ALL'),

('CALIDAD_LLAMADA', 'CRITICO',
 'Calidad CRÍTICO — Disminuye intencionalmente ritmo laboral',
 'Item CRÍTICO de la categoría SEGUIMIENTO. Aplica a TM, Ventas y VASS.

SE DETECTA Y SANCIONA:
- Ocupación del canal por más de 1 minuto sin actividad justificada.
- Cuelgue PASIVO: deja al cliente en espera y no retoma — el cliente cuelga.
- Cuelgue INTENCIONAL: en Zoho queda registro de que el USUARIO (asesor) finalizó la llamada — no fue el cliente.

REGLAS:
- Mantén productividad acorde a los tiempos y objetivos del Call Center.
- Si necesitas pausa, comunica al líder.
- Cuelga la llamada SOLO cuando el cliente se despidió o pidió finalizar.
- Si el cliente desaparece de la línea, intenta retomar y documenta.',
 'ALL'),

('CALIDAD_LLAMADA', 'CRITICO',
 'Calidad CRÍTICO — Cambia estado correctamente en Zoho',
 'Item CRÍTICO de la categoría SEGUIMIENTO. Aplica a TM, Ventas y VASS.

OBLIGACIÓN:
- Al terminar cada gestión, actualiza el estado del lead/cita en Zoho según lo que REALMENTE pasó.
- Los estados disponibles están documentados (categoría PROCESO en el manual).

ERRORES COMUNES QUE INCUMPLEN:
- Dejar el lead como Nuevo Lead cuando ya hablaste con el cliente.
- Marcar Cita Confirmada cuando solo coordinaste pero no confirmaste.
- No mover a Credit Fail después de que el préstamo no aprobó.
- Dejar No contesta cuando el cliente sí contestó y dijo no.

El estado correcto es lo que permite a Calidad, Líderes y al equipo siguiente entender qué pasó sin tener que escuchar la grabación.',
 'ALL'),

('CALIDAD_LLAMADA', 'CRITICO',
 'Calidad CRÍTICO — Revisión del historial de contactos',
 'Item CRÍTICO de la categoría SEGUIMIENTO. Aplica a TM, Ventas y VASS.

ANTES DE LLAMAR / CONTACTAR:
- Consulta la trazabilidad del lead en Zoho.
- Revisa deals anteriores para asignación de consultores correcta.
- Verifica si el cliente ya fue contactado por otro asesor recientemente.

CONSECUENCIAS DE NO REVISAR:
- Duplicar llamadas → cliente molesto → daño a la marca.
- Repetir acciones ya hechas (pedir documentos que ya tenemos).
- Asignar a un consultor equivocado.

Tip: si vas a contactar un lead, abre primero el historial y dale 30 segundos de lectura — te ahorra minutos en la llamada.',
 'ALL'),

('CALIDAD_LLAMADA', 'NO_CRITICO',
 'Calidad NO CRÍTICOS — Resumen de los 12 items',
 'Items NO CRÍTICOS que suman a la nota pero no son rupturas graves:

INICIO (4):
- Saludo: presenta WH + cargo + tono formal.
- Presentar su función: objetivo claro de la llamada.
- Preguntas de investigación: identifica necesidad/interés del cliente.
- Despedida: agradece, cordial, profesional.

ACTITUD COMERCIAL (7):
- Solicita y justifica tiempos de espera.
- Atiende oportunamente (5 segundos).
- Establece acuerdos y compromisos para el cierre.
- Indaga comercialmente (despierta interés).
- Presenta posibilidades para cita/venta.
- Escucha activa.
- Tono y ritmo de voz apropiado.

SEGUIMIENTO (1):
- Documenta de manera completa y apropiada en ZOHO CRM.

VENTA O ASIGNACIÓN DE CITA (1, ítem extra N/A):
- Logra venta o cita en la llamada.

Cada uno vale 5 puntos en cumplimiento total. No son menos importantes — solo no descalifican una llamada si fallan individualmente. La SUMA de no críticos impacta la nota final.',
 'ALL'),

('CALIDAD_LLAMADA', 'TIEMPOS',
 'Calidad TM — Tiempo de espera máximo 60 segundos',
 'PARA ASESORES DE TELEMERCADEO:

Cuando justifiques una espera al cliente durante la llamada, el tiempo MÁXIMO permitido es 60 segundos sin retomar la línea.

Reglas:
- Menciona el motivo de la espera ANTES de poner al cliente en hold.
- Agradece al retomar la llamada.
- Si la espera supera 60 segundos, debes retomar al cliente cada 60 segundos para confirmar avance y que continúe en línea.
- Si tú necesitas más tiempo, prefiere agendar callback en lugar de mantener al cliente colgado.

¿Por qué TM tiene 60 seg y Ventas/VASS tienen 210 seg? Porque las llamadas de TM son más breves y de prospección — el cliente NO está esperando una consulta técnica que justifique espera larga.',
 'Telemercadeo'),

('CALIDAD_LLAMADA', 'TIEMPOS',
 'Calidad Ventas — Tiempo de espera máximo 210 segundos',
 'PARA ASESORES DE VENTAS:

Cuando justifiques una espera al cliente durante la llamada, el tiempo MÁXIMO permitido es 210 segundos (3.5 minutos) sin retomar.

Reglas:
- Menciona el motivo de la espera ANTES de poner al cliente en hold.
- Agradece al retomar la llamada.
- Cada 60 segundos durante el hold, retoma brevemente para que el cliente sepa que sigues con su caso.
- 210 segundos es el TECHO — busca siempre que sea más corto.

¿Por qué Ventas tiene 210 seg? Las llamadas de Ventas pueden requerir verificación de cotizaciones técnicas, validación de financiamiento con WH Financial / EnFin, consulta de inventario o disponibilidad de instalación. Estas tareas justifican esperas más largas que las de prospección de TM.',
 'Ventas'),

('CALIDAD_LLAMADA', 'TIEMPOS',
 'Calidad VASS — Tiempo de espera máximo 210 segundos',
 'PARA ASESORES DE VASS / CONSULTANT:

Cuando justifiques una espera al cliente durante la llamada, el tiempo MÁXIMO permitido es 210 segundos (3.5 minutos) sin retomar.

Reglas (idénticas a Ventas):
- Menciona el motivo de la espera ANTES.
- Agradece al retomar.
- Cada 60 segundos durante el hold, retoma para que el cliente sepa que sigues.
- 210 seg es techo — busca siempre que sea menor.

¿Por qué VASS tiene 210 seg igual que Ventas? Porque VASS corre crédito en vivo durante la llamada (WH Financial, Oriental, EnFin, LightReach). La verificación de aprobación puede tomar varios minutos. La espera está justificada por la naturaleza de la gestión.',
 'Vass');
