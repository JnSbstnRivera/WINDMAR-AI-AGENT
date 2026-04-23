-- ============================================================
-- WINDMAR AI AGENT — Herramientas del Call Center
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- DESPUÉS de ejecutar 01_schema.sql
-- ============================================================

INSERT INTO public.knowledge_base (categoria, subcategoria, producto_id, titulo, contenido, metadata, area, activo)
VALUES

-- 1. Panel General de Herramientas
(
  'Herramientas',
  'Panel General',
  'TOOL-PANEL',
  'Panel de Herramientas del Call Center',
  'El Panel de Herramientas es el punto de entrada principal para todos los asesores del call center de Windmar Home. Desde aquí puedes acceder a todos los cotizadores y calculadoras disponibles.

ENLACE DIRECTO: https://panel-de-herramientas-call-center.vercel.app/

Herramientas disponibles desde el panel:
- Cotizador de Agua
- Cotizador Loan (financiamiento)
- Cotizador Lease / PPA
- Cotizador Roofing
- Calculadora Anker (baterías)
- Cotizador Proyecto Completo

Úsalo cuando el cliente quiera ver opciones generales o cuando no sepas por cuál cotizador empezar.',
  '{"url": "https://panel-de-herramientas-call-center.vercel.app/", "tipo": "panel", "acceso": "todos"}',
  'Telemercadeo,VASS,Ventas',
  true
),

-- 2. Cotizador Agua
(
  'Herramientas',
  'Cotizadores',
  'TOOL-AGUA',
  'Cotizador de Agua — Productos de Filtración y Tratamiento',
  'Herramienta para cotizar productos de agua de Windmar Home: sistemas de filtración, purificación y tratamiento de agua para el hogar.

ENLACE DIRECTO: https://cotizador-agua.vercel.app/

Cuándo usar esta herramienta:
- Cliente pregunta por sistemas de agua o filtros
- Cliente quiere mejorar la calidad del agua en su hogar
- Cliente tiene problemas con el sabor o calidad del agua de PRASA
- Cliente interesado en independizarse del agua municipal

Tip: Menciona que Windmar tiene más de 22 años en Puerto Rico y ofrece financiamiento para los sistemas de agua igual que para placas solares.',
  '{"url": "https://cotizador-agua.vercel.app/", "tipo": "cotizador", "producto": "agua"}',
  'Telemercadeo,VASS,Ventas',
  true
),

-- 3. Cotizador Loan
(
  'Herramientas',
  'Financiamiento',
  'TOOL-LOAN',
  'Cotizador Loan — Financiamiento con Préstamo Solar',
  'Herramienta para calcular financiamiento tipo Loan (préstamo) para sistemas solares. El cliente es dueño del sistema desde el día uno.

ENLACE DIRECTO: https://cotizador-loan.vercel.app/

Características del Loan:
- El cliente es propietario del sistema solar
- Aplica para créditos tributarios federales (ITC 30%)
- Pagos fijos mensuales
- Al terminar de pagar, el sistema es 100% del cliente sin costos adicionales
- Ideal para clientes que quieren ser dueños y maximizar el retorno de inversión

Cuándo usar esta herramienta:
- Cliente quiere ser dueño del sistema
- Cliente tiene buen crédito y quiere aprovechar el crédito federal
- Cliente pregunta por financiamiento o préstamo solar
- Comparar con Lease para que el cliente tome la mejor decisión

Tip de cierre: "Con el Loan usted es el dueño desde el primer día y aplica para el crédito federal del 30% — eso le reduce significativamente el costo total."',
  '{"url": "https://cotizador-loan.vercel.app/", "tipo": "cotizador", "producto": "solar", "financiamiento": "loan"}',
  'VASS,Ventas',
  true
),

-- 4. Cotizador Lease / PPA
(
  'Herramientas',
  'Financiamiento',
  'TOOL-LEASE',
  'Cotizador Lease / PPA — Energía Solar Sin Inversión Inicial',
  'Herramienta para cotizar el programa Lease y PPA (Power Purchase Agreement) de Windmar Home a través de LightReach. El cliente usa energía solar sin comprar el sistema.

ENLACE DIRECTO: https://cotizador-lease-ppa.vercel.app/

Características del Lease / PPA:
- El cliente NO compra el sistema, lo arrienda
- Cero inversión inicial ($0 down)
- LightReach es el dueño del sistema
- El cliente paga una tarifa fija mensual menor a lo que paga a LUMA
- No aplica para crédito federal (el dueño del sistema lo toma)
- Ideal para clientes que no califican para loan o no quieren deuda

Cuándo usar esta herramienta:
- Cliente dice que no tiene dinero para el inicial
- Cliente tiene crédito limitado
- Cliente quiere ahorrar sin comprometerse a un préstamo
- Área VASS: cuando el crédito no aprueba para Loan, ofrecer Lease como alternativa

Diferencia clave Lease vs Loan:
- Lease: $0 inicial, no eres dueño, pero ahorras desde el día 1
- Loan: eres dueño, aplica crédito federal, mayor beneficio a largo plazo',
  '{"url": "https://cotizador-lease-ppa.vercel.app/", "tipo": "cotizador", "producto": "solar", "financiamiento": "lease", "proveedor": "LightReach"}',
  'VASS,Ventas',
  true
),

-- 5. Cotizador Roofing
(
  'Herramientas',
  'Cotizadores',
  'TOOL-ROOFING',
  'Cotizador Roofing — Techo y Sellado',
  'Herramienta para generar cotizaciones de roofing (sellado y reemplazo de techo) de Windmar Home.

ENLACE DIRECTO: https://cotizador-roofing.vercel.app/

Tipos de servicio de Roofing:
- Sellado de techo (coating)
- Reemplazo completo de techo
- Reparaciones puntuales

Cuándo usar esta herramienta:
- Cliente pregunta por el techo o roofing
- Cliente tiene goteras o techo dañado
- Cliente quiere preparar el techo antes de instalar placas solares
- Cliente pregunta cuánto cuesta sellar su techo

Información clave para el asesor:
- El área del techo se mide en pies cuadrados (sqft)
- Un techo promedio en Puerto Rico es entre 1,200 y 2,500 sqft
- Windmar ofrece financiamiento también para roofing
- Combinar roofing con solar da mejores precios (ver Proyecto Completo)

Tip: "Antes de instalar las placas solares, es importante asegurarse de que el techo esté en buenas condiciones — de esa forma protege su inversión solar."',
  '{"url": "https://cotizador-roofing.vercel.app/", "tipo": "cotizador", "producto": "roofing"}',
  'Telemercadeo,VASS,Ventas',
  true
),

-- 6. Calculadora Anker
(
  'Herramientas',
  'Cotizadores',
  'TOOL-ANKER',
  'Calculadora Anker — Baterías Portátiles y Estacionarias',
  'Herramienta para calcular y cotizar baterías portátiles y estacionarias de la marca Anker, distribuidas por Windmar Home en Puerto Rico.

ENLACE DIRECTO: https://calculador-anker.vercel.app/

Productos Anker disponibles:
- Baterías portátiles (power stations)
- Baterías estacionarias para el hogar
- Paneles solares portátiles compatibles con Anker

Cuándo usar esta herramienta:
- Cliente pregunta por baterías o backup de energía
- Cliente quiere independizarse de LUMA sin instalar sistema completo
- Cliente tiene presupuesto limitado y quiere empezar con una batería
- Cliente pregunta por las baterías Anker específicamente
- Cliente interesado en solución portátil (para emergencias, huracanes)

Ventajas de Anker con Windmar:
- Garantía respaldada por Windmar en Puerto Rico
- Disponibilidad local, no hay que esperar envíos de fuera
- Soporte técnico local
- Se puede financiar igual que los demás productos',
  '{"url": "https://calculador-anker.vercel.app/", "tipo": "cotizador", "producto": "baterias", "marca": "Anker"}',
  'Telemercadeo,VASS,Ventas',
  true
),

-- 7. Cotizador Proyecto Completo
(
  'Herramientas',
  'Cotizadores',
  'TOOL-PROYECTO-COMPLETO',
  'Cotizador Proyecto Completo — Roofing + Placas Solares + Batería (Mayor Ahorro)',
  'Herramienta para cotizar el paquete completo de Windmar Home: Roofing (techo) + Sistema Solar (placas) + Batería. Este paquete incluye los mayores descuentos y beneficios disponibles.

ENLACE DIRECTO: https://proyecto-completo-three.vercel.app/

¿Qué incluye el Proyecto Completo?
- Sellado o reemplazo de techo (Roofing)
- Sistema de placas solares fotovoltaicas
- Batería de almacenamiento de energía
- Todo en un solo financiamiento

Por qué es la mejor opción:
- MAYOR AHORRO: al combinar los tres productos se obtienen descuentos exclusivos que no están disponibles si se compran por separado
- UN SOLO PAGO MENSUAL para los tres productos
- El cliente resuelve techo, energía y respaldo en una sola decisión
- Protege la inversión solar con un techo nuevo

Cuándo usar esta herramienta:
- Cliente está abierto a mejorar techo, solar y batería
- Cliente quiere el mayor ahorro posible a largo plazo
- Cliente pregunta por el paquete completo o por los descuentos especiales
- Cliente que paga más de $200 mensuales en LUMA y tiene techo en mal estado
- Cliente que quiere total independencia energética

Tip de cierre: "El Proyecto Completo es nuestra oferta estrella — al combinar los tres productos usted obtiene descuentos que no existen si los compra por separado, y queda con techo nuevo, energía solar y batería en un solo pago mensual menor a lo que paga ahora en LUMA."

IMPORTANTE: Siempre presentar este cotizador cuando el cliente muestre interés en más de un producto.',
  '{"url": "https://proyecto-completo-three.vercel.app/", "tipo": "cotizador", "producto": "proyecto_completo", "incluye": ["roofing", "solar", "bateria"], "prioridad": "alta"}',
  'Telemercadeo,VASS,Ventas',
  true
);
