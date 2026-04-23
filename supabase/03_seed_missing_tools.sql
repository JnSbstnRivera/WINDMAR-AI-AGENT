-- ============================================================
-- WINDMAR AI AGENT — Herramientas faltantes en knowledge_base
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

INSERT INTO public.knowledge_base (categoria, subcategoria, producto_id, titulo, contenido, metadata, area, activo)
VALUES

-- LUMA Scanner
(
  'Herramientas',
  'Prospección',
  'TOOL-LUMA-SCANNER',
  'LUMA Scanner — Lector de Facturas LUMA Energy',
  'El LUMA Scanner es la herramienta de primer contacto en el proceso de venta solar de Windmar Home. Permite escanear y analizar la factura de electricidad del cliente de LUMA Energy.

ENLACE DIRECTO: https://luma-scanner-two.vercel.app/

Cómo usarlo en la llamada:
1. Pedir al cliente que tenga su factura de LUMA a mano (física o digital)
2. Ingresar los datos de consumo del recibo
3. La herramienta calcula el potencial de ahorro con energía solar
4. Usar el resultado para personalizar la cotización

Cuándo usar esta herramienta:
- SIEMPRE al inicio de cualquier conversación sobre energía solar
- Cuando el cliente menciona cuánto paga en LUMA
- Cliente que paga más de $150 mensuales en electricidad es candidato ideal
- Antes de abrir cualquier cotizador de Loan o Lease

Datos clave para el asesor:
- Un cliente que paga $200/mes en LUMA tiene un potencial de ahorro significativo
- El Scanner muestra el consumo en kWh, que determina el tamaño del sistema solar
- Los datos del Scanner alimentan directamente el Cotizador Loan y Lease

Tip: "¿Tiene su factura de LUMA a mano? Con eso puedo decirle exactamente cuánto puede ahorrar con las placas solares."',
  '{"url": "https://luma-scanner-two.vercel.app/", "tipo": "scanner", "producto": "solar", "etapa": "prospección"}',
  'Telemercadeo,Ventas',
  true
),

-- Calculadora Placas x Aires
(
  'Herramientas',
  'Dimensionamiento',
  'TOOL-PLACAS-AC',
  'Calculadora Placas x Aires Acondicionados — Dimensionamiento Solar',
  'Calculadora especializada para determinar cuántos paneles solares necesita el cliente basándose en sus sistemas de aire acondicionado. Usa inteligencia artificial (Gemini) para hacer los cálculos.

ENLACE DIRECTO: https://calculadora-placas-aires-acondicion.vercel.app/

Cómo funciona:
1. El asesor ingresa los aires acondicionados que tiene el cliente (cantidad, BTU o toneladas)
2. La calculadora determina el consumo eléctrico total de los AC
3. Calcula el número de paneles solares de 410W necesarios
4. Muestra gráficas del consumo y producción solar

Cuándo usar esta herramienta:
- Cliente pregunta cuántas placas necesita para sus aires
- Cliente tiene varios sistemas de AC y quiere dimensionar bien el sistema solar
- Para hacer una propuesta técnica más precisa antes del Cotizador Loan o Lease
- Cuando el cliente dice "tengo 3 aires de 1.5 toneladas"

Datos técnicos que necesitas del cliente:
- Cantidad de aires acondicionados
- Tamaño de cada aire (BTU, toneladas o modelo)
- Horas aproximadas de uso diario

Tip: "Para darle una propuesta exacta, ¿me puede decir cuántos aires tiene y de qué tamaño? Con eso uso nuestra calculadora y le digo exactamente cuántas placas necesita."',
  '{"url": "https://calculadora-placas-aires-acondicion.vercel.app/", "tipo": "calculadora", "producto": "solar", "etapa": "dimensionamiento"}',
  'VASS,Ventas',
  true
),

-- Calculadora Solar EV
(
  'Herramientas',
  'Vehículos Eléctricos',
  'TOOL-SOLAR-EV',
  'Calculadora Solar para Vehículos Eléctricos — Paneles para Cargar tu Carro',
  'Herramienta especializada para calcular cuántos paneles solares de 410W necesita un cliente para cubrir el consumo eléctrico de su vehículo eléctrico. Compatible con 14 modelos de carros eléctricos populares.

ENLACE DIRECTO: https://calculadora-solar-ev.vercel.app/

Modelos de carros compatibles:
Tesla Model 3, Model S, Model Y, Model X · Volvo XC40 Recharge · Chevrolet Bolt EV · Nissan Leaf · BMW i3 · Hyundai Kona Electric · Kia e-Niro · VW ID.4 · Ford Mustang Mach-E · Audi e-tron

Datos configurables:
- Millas manejadas por día (slider de 5 a 60 millas)
- Potencia del panel solar (250-600W, default 410W)
- Horas pico de sol en Puerto Rico (default 4.5 horas)

Cuándo usar esta herramienta:
- Cliente tiene o está comprando un carro eléctrico
- Cliente pregunta si puede cargar su EV con energía solar
- Cliente quiere calcular el sistema solar para casa + carro eléctrico
- Argumento de venta: "Con Windmar puede cargar su carro gratis con el sol"

Argumento de venta clave:
Cargar un Tesla Model 3 en Puerto Rico necesita aproximadamente 2-3 paneles adicionales al sistema base. El cliente deja de pagar gasolina Y electricidad al mismo tiempo.

Tip de cierre: "¿Sabía que con nuestro sistema solar puede cargar su [modelo de carro] sin pagar ni gasolina ni luz? Le muestro exactamente cuántos paneles necesita."',
  '{"url": "https://calculadora-solar-ev.vercel.app/", "tipo": "calculadora", "producto": "solar_ev", "etapa": "ventas"}',
  'Ventas',
  true
);
