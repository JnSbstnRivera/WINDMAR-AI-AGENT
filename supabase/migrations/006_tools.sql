-- ============================================================
-- WINDMAR AI AGENT — Migración 006: tabla `tools`
-- Mueve la lista hardcoded de herramientas (chat/route.ts) a Supabase
-- para que se administre desde el dashboard sin redeploy.
--
-- Espejo del panel de herramientas (PANEL-DE-HERRAMIENTAS-CALL-CENTER)
-- con metadata para el LLM: triggers, topic, when_to_use, oficial flag.
--
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tools (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  -- Identidad
  slug          TEXT NOT NULL UNIQUE,            -- 'cotizador-loan', 'luma-scanner'
  name          TEXT NOT NULL,                   -- 'Cotizador Loan'
  url           TEXT NOT NULL,
  description   TEXT,                            -- Para el card visual (1 línea)

  -- Contexto para el LLM
  when_to_use   TEXT NOT NULL,                   -- Frase descriptiva para el prompt
  triggers      TEXT[] NOT NULL DEFAULT '{}',    -- Palabras clave que activan la recomendación
  topic         TEXT NOT NULL DEFAULT 'general'  -- 'solar' | 'roofing' | 'water' | 'anker' | 'ev' | 'financiamiento' | 'cierre' | 'pre-venta' | 'gestion' | 'general'
                CHECK (topic IN ('solar','roofing','water','anker','ev','financiamiento','cierre','pre-venta','gestion','general')),

  -- Visual / UI
  category      TEXT NOT NULL DEFAULT 'GENERAL', -- Misma taxonomía del panel
  icon          TEXT,                            -- Emoji o slug de icono (☀️, 🔋, 💧...)

  -- Flags
  is_official   BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE = cotizadores oficiales windmar.com (vs internos vercel.app)
  recommend     BOOLEAN NOT NULL DEFAULT TRUE,   -- FALSE = el LLM NO la recomienda (gestión interna: 3CX, Zoho...)
  active        BOOLEAN NOT NULL DEFAULT TRUE,   -- Soft disable sin borrar
  sort_order    INT NOT NULL DEFAULT 100
);

CREATE INDEX IF NOT EXISTS idx_tools_active ON public.tools(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_tools_topic ON public.tools(topic);
CREATE INDEX IF NOT EXISTS idx_tools_triggers ON public.tools USING GIN(triggers);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_tools_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tools_updated_at ON public.tools;
CREATE TRIGGER tools_updated_at
  BEFORE UPDATE ON public.tools
  FOR EACH ROW EXECUTE FUNCTION update_tools_updated_at();

-- RLS: solo service_role (sin políticas explícitas)
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SEED: las 29 herramientas del panel de herramientas
-- ============================================================
INSERT INTO public.tools (slug, name, url, description, when_to_use, triggers, topic, category, icon, is_official, recommend, sort_order) VALUES

-- ─── COTIZADORES CALL CENTER (interno, vercel.app) ─────────────────
('luma-scanner', 'LUMA Scanner', 'https://luma-scanner-two.vercel.app/',
 'Análisis del bill de LUMA y definición de placas',
 'Primer paso del proceso de venta solar. Cuando el cliente menciona su factura de LUMA, cuánto paga de luz, o quiere saber cuánto ahorra con solar.',
 ARRAY['luma','factura','bill','luz','paga','consumo','kwh','electricidad','recibo','$200','$150','$300','mensual'],
 'solar', 'COTIZADORES CALL CENTER', '⚡', FALSE, TRUE, 10),

('cotizador-loan', 'Cotizador Loan', 'https://cotizador-loan.vercel.app/',
 'Préstamo solar (Oriental Bank, plazos 10/15/20/25 años)',
 'Cliente quiere ser dueño del sistema solar, buen crédito, aprovechar crédito federal 30%. Oriental Bank, planes 10/15/20/25 años.',
 ARRAY['loan','préstamo','prestamo','dueño','oriental bank','crédito federal','30%','comprar','mensualidad','plazo','10 años','15 años','20 años','25 años','correr crédito','financiamiento'],
 'solar', 'COTIZADORES CALL CENTER', '💰', FALSE, TRUE, 20),

('cotizador-lease', 'Cotizador Lease / PPA', 'https://cotizador-lease-ppa.vercel.app/',
 'Arrendamiento solar con $0 inicial (LightReach)',
 '$0 inicial, sin deuda, alternativa cuando el Loan no aprueba. LightReach es el dueño. Ideal para crédito limitado.',
 ARRAY['lease','ppa','lightreach','$0','cero inicial','no quiere préstamo','no aprobó','crédito malo','alternativa','sin inversión'],
 'solar', 'COTIZADORES CALL CENTER', '📋', FALSE, TRUE, 30),

('cotizador-roofing', 'Cotizador Roofing Pro', 'https://cotizador-roofing-pro.vercel.app/',
 'Techos y sellado — planes Silver, Gold, Platinum',
 'Cliente pregunta por techo, goteras, sellado antes de solar. Planes Silver, Gold, Platinum.',
 ARRAY['roofing','techo','sellado','sello','gotera','roof','silver','gold','platinum','sqft','pies cuadrados','reparar techo','reparación de techo'],
 'roofing', 'COTIZADORES CALL CENTER', '🏠', FALSE, TRUE, 40),

('cotizador-agua', 'Cotizador Agua', 'https://cotizador-agua.vercel.app/',
 'Sistemas de agua y filtración',
 'Cliente pregunta por sistemas de agua, filtros o calidad del agua.',
 ARRAY['agua','water','filtro','filtración','purificación','prasa','acueducto','calidad del agua','sistema de agua'],
 'water', 'COTIZADORES CALL CENTER', '💧', FALSE, TRUE, 50),

('calculadora-anker', 'Calculadora Anker', 'https://calculador-anker.vercel.app/',
 'Baterías Anker — backup portátil',
 'Cliente pregunta por baterías Anker, backup portátil o solución de emergencia.',
 ARRAY['anker','batería','baterías','battery','backup','portátil','emergencia','huracán','apagón','blackout','power station','solix','f2600','f3800','bp2600','c300'],
 'anker', 'COTIZADORES CALL CENTER', '🔋', FALSE, TRUE, 60),

('proyecto-completo', 'Cotizador Proyecto Completo', 'https://proyecto-completo-three.vercel.app/',
 'Roofing + Solar + Batería — mayor descuento',
 'SIEMPRE que el cliente muestre interés en más de un producto. Roofing + Solar + Batería con los mayores descuentos.',
 ARRAY['proyecto completo','todo junto','paquete','los tres','techo y solar','solar y batería','todo en uno','descuento','combo','integral'],
 'general', 'COTIZADORES CALL CENTER', '📦', FALSE, TRUE, 70),

-- ─── COTIZADORES WINDMAR HOME (oficiales, windmar.com) ─────────────
('cotizador-lease-wh', 'Lease PPA (Oficial WH)', 'https://windmar.com/pr/windmarEnergy/4258103000000711076',
 'Windmar Energy PPA — versión oficial corporativa',
 'Usar cuando el asesor sea Channel/Project M, o el cliente pida cotización OFICIAL Windmar (no la interna del Call Center).',
 ARRAY['lease oficial','ppa oficial','windmar energy','cotización oficial','official lease'],
 'solar', 'COTIZADORES WINDMAR HOME', '📋', TRUE, TRUE, 80),

('cotizador-loan-wh', 'Loan Oficial WH', 'https://windmar.com/pr/windmarSolar/4258103000495294471',
 'WH Financial / Oriental — préstamo oficial corporativo',
 'Cotizador oficial corporativo para préstamo solar (WH Financial / Oriental). Usar cuando se solicite cotización OFICIAL.',
 ARRAY['loan oficial','préstamo oficial','windmar solar','cotización oficial loan'],
 'solar', 'COTIZADORES WINDMAR HOME', '💰', TRUE, TRUE, 90),

('cotizador-water-wh', 'Water Oficial WH', 'https://windmar.com/pr/waterQuote/4258103000033020059',
 'Windmar Water Quote — oficial corporativo',
 'Cotizador oficial corporativo de agua. Usar cuando se solicite cotización OFICIAL Windmar.',
 ARRAY['water oficial','agua oficial','water quote','cotización oficial agua'],
 'water', 'COTIZADORES WINDMAR HOME', '💧', TRUE, TRUE, 100),

('cotizador-roofing-wh', 'Roofing Oficial WH', 'https://windmar.com/pr/windmarRoofing/4258103000003350226',
 'Windmar Roofing Quote — oficial corporativo',
 'Cotizador oficial corporativo de roofing. Usar cuando se solicite cotización OFICIAL Windmar.',
 ARRAY['roofing oficial','techos oficial','windmar roofing','cotización oficial roofing'],
 'roofing', 'COTIZADORES WINDMAR HOME', '🏠', TRUE, TRUE, 110),

-- ─── HERRAMIENTAS ADICIONALES ──────────────────────────────────────
('calculadora-placas-ac', 'Calculadora Placas × Aires', 'https://calculadora-placas-aires-acondicion.vercel.app/',
 'Dimensiona paneles según aires acondicionados del cliente',
 'Cliente quiere saber cuántos paneles necesita según sus aires acondicionados.',
 ARRAY['aires','aire acondicionado','ac','split','mini split','cuántas placas','cuántos paneles','dimensionar'],
 'solar', 'HERRAMIENTAS ADICIONALES', '❄️', FALSE, TRUE, 120),

('calculadora-ev', 'Calculadora Solar EV', 'https://calculadora-solar-ev.vercel.app/',
 'Solar para vehículos eléctricos',
 'Cliente tiene carro eléctrico y quiere cargarlo con energía solar.',
 ARRAY['carro eléctrico','vehículo eléctrico','ev','tesla','cargar el carro','nissan leaf','chevy bolt','kia','ford mach'],
 'ev', 'HERRAMIENTAS ADICIONALES', '🚗', FALSE, TRUE, 130),

('calculadora-enseres', 'Calculadora Enseres', 'https://calculadora-enseres.vercel.app/',
 'Consumo eléctrico del hogar por electrodomésticos',
 'Cliente pregunta por consumo de electrodomésticos / dimensionar sistema según enseres del hogar.',
 ARRAY['enseres','electrodomesticos','electrodomésticos','nevera','aire','consumo del hogar','calculadora consumo','dimensionar por enseres'],
 'solar', 'HERRAMIENTAS ADICIONALES', '🧮', FALSE, TRUE, 140),

-- ─── FINANCIERAS ───────────────────────────────────────────────────
('aurora', 'Aurora Solar', 'https://v2.aurorasolar.com/projects?page=1&archived=false',
 'Diseño solar técnico avanzado',
 'Diseño solar técnico avanzado para Líder/Channel/Project M. Cliente o asesor pide propuesta visual con shading study.',
 ARRAY['aurora','diseño solar','propuesta visual','shading study','diseño técnico'],
 'solar', 'FINANCIERAS', '📐', FALSE, TRUE, 150),

('wh-financial', 'WH Financial', 'https://sales.p.whfinancial.digifi.io/sign-in',
 'Préstamo WH Financial (financiamiento propio)',
 'Plataforma WH Financial — financiamiento solar propio de Windmar. Usar cuando el cliente pregunte por la financiera interna o el asesor necesite correr el crédito.',
 ARRAY['wh financial','financiera windmar','digifi','correr crédito wh','prestamo wh'],
 'financiamiento', 'FINANCIERAS', '💰', FALSE, TRUE, 160),

('enfin', 'ENFIN', 'https://partnerapp.enfin.com/login',
 'Lease ENFIN — alternativa a LightReach',
 'Financiera ENFIN — alternativa de lease cuando LightReach/Palmetto no aplica. Solo asesores con cuenta partner.',
 ARRAY['enfin','lease enfin','partner enfin','alternativa lease'],
 'financiamiento', 'FINANCIERAS', '📋', FALSE, TRUE, 170),

('palmetto-lightreach', 'Palmetto LightReach', 'https://auth.palmetto.com/login',
 'Lease Palmetto LightReach (portal asesor)',
 'Portal del asesor en Palmetto — Lease LightReach. Usar para correr aplicación o ver status del cliente.',
 ARRAY['palmetto','lightreach portal','portal palmetto','status lightreach','aplicación palmetto'],
 'financiamiento', 'FINANCIERAS', '☀️', FALSE, TRUE, 180),

('synchrony', 'Synchrony', 'https://businesscenter.synchronybusiness.com/partnersso/login',
 'Financiera Synchrony (Anker y Water)',
 'Financiera Synchrony — usada para financiar Anker y Water (no solar). Plataforma del asesor.',
 ARRAY['synchrony','financiar anker','financiar agua','financiera anker','financiera water','sinchrony','synchronybusiness'],
 'financiamiento', 'FINANCIERAS', '💳', FALSE, TRUE, 190),

('kiwi', 'Kiwi Credit', 'https://www.kiwicredito.com/',
 'Financiera Kiwi (alterna)',
 'Financiera Kiwi — alterna para clientes con perfil específico. Plataforma de pagos / crédito.',
 ARRAY['kiwi','kiwi credito','financiera alterna','kiwicredito'],
 'financiamiento', 'FINANCIERAS', '💳', FALSE, TRUE, 200),

-- ─── HERRAMIENTAS DE GESTIÓN (asociadas a venta) ───────────────────
('docusign', 'DocuSign — Contratos', 'https://powerforms.docusign.net/',
 'Firma digital de contratos (Solar, Roofing, Water, Anker, Batería)',
 'Cierre de venta — firma digital de contrato. Hay versiones por producto, con/sin co-deudor, en español/inglés. Pregunta al asesor qué producto antes de mandar link específico.',
 ARRAY['docusign','firma','contrato','firmar','power form','powerforms','cierre','firma digital'],
 'cierre', 'HERRAMIENTAS DE GESTIÓN', '📝', FALSE, TRUE, 210),

('smartsheet', 'Smartsheet — Post-Venta', 'https://app.smartsheet.com/b/form/8cc3938c7cd2474ca10769a43195f260',
 'Documentos e instalación post-venta',
 'Post-venta — registro de documentos para instalación. Usar después del cierre, NO durante la conversación de venta.',
 ARRAY['smartsheet','instalación','documentos instalación','post venta','registro instalación'],
 'cierre', 'HERRAMIENTAS DE GESTIÓN', '📋', FALSE, TRUE, 220),

('catastro-crim', 'Catastro CRIM Puerto Rico', 'https://catastro.crimpr.net/cdprpc/',
 'Validar propiedad del cliente (CRIM PR)',
 'Pre-venta — validar propiedad del cliente y datos catastrales antes de cotizar.',
 ARRAY['crim','catastro','propiedad','validar propiedad','catastro pr','crimpr'],
 'pre-venta', 'HERRAMIENTAS DE GESTIÓN', '🗺️', FALSE, TRUE, 230),

('regrid', 'Regrid — Mapas', 'https://regrid.com/',
 'Mapas catastrales alternos (Regrid)',
 'Validar propiedad/terreno cuando CRIM no tiene info clara. Mapas catastrales y datos parcela.',
 ARRAY['regrid','mapa','parcela','terreno','catastro alterno'],
 'pre-venta', 'HERRAMIENTAS DE GESTIÓN', '🗺️', FALSE, TRUE, 240),

('measure-map', 'Measure Map — Medir Techo', 'https://app.measuremaponline.com/dashboard/overview',
 'Medición remota del techo del cliente',
 'Pre-cotización Roofing — medir el techo del cliente sin ir presencial.',
 ARRAY['measure','medir techo','medición techo','medida techo','measuremap','area techo'],
 'pre-venta', 'HERRAMIENTAS DE GESTIÓN', '📐', FALSE, TRUE, 250),

-- ─── PANEL Y GESTIÓN INTERNA (recommend=FALSE, solo si se pregunta) ─
('panel-general', 'Panel de Herramientas', 'https://panel-de-herramientas-call-center.vercel.app/',
 'Acceso central a todas las herramientas Windmar',
 'Acceso central a todas las herramientas. Usar como fallback cuando no hay una herramienta específica.',
 ARRAY['panel','herramientas','dashboard de herramientas'],
 'general', 'GESTIÓN', '🧰', FALSE, TRUE, 260),

('3cx', '3CX — Llamadas', 'https://gs3.3cx.us:5001/#/login',
 'Aplicativo de llamadas del Call Center',
 'Operativo — el asesor usa esta plataforma para llamar. NO recomendar proactivamente, solo si pregunta cómo entrar.',
 ARRAY['3cx','llamadas','telefono','llamada cliente'],
 'gestion', 'GESTIÓN', '📞', FALSE, FALSE, 270),

('zoho', 'Zoho CRM', 'https://crm.zoho.com/crm/org699641359/tab/Home/begin',
 'CRM de la compañía',
 'Operativo — CRM donde el asesor registra leads, llamadas y oportunidades. NO recomendar proactivamente.',
 ARRAY['zoho','crm','lead','oportunidad','registrar venta','registrar cliente'],
 'gestion', 'GESTIÓN', '📊', FALSE, FALSE, 280),

('botmaker', 'Botmaker — WhatsApp', 'https://go.botmaker.com/#/chats/CB5F5Y2MJAGHR6B3DOBY',
 'WhatsApp corporativo Windmar',
 'Operativo — WhatsApp interno. NO recomendar proactivamente.',
 ARRAY['botmaker','whatsapp','wa','mensaje whatsapp'],
 'gestion', 'GESTIÓN', '💬', FALSE, FALSE, 290)

ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  url = EXCLUDED.url,
  description = EXCLUDED.description,
  when_to_use = EXCLUDED.when_to_use,
  triggers = EXCLUDED.triggers,
  topic = EXCLUDED.topic,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  is_official = EXCLUDED.is_official,
  recommend = EXCLUDED.recommend,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- ============================================================
-- Columna tool_refs en `messages` — guarda qué herramientas
-- recomendó el LLM en cada respuesta del asistente.
-- Permite re-renderizar los cards al recargar la conversación.
-- ============================================================
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS tool_refs JSONB;

COMMENT ON COLUMN public.messages.tool_refs IS
  'Array de slugs de tools (text[]) que se recomendaron en este mensaje del asistente. Ejemplo: ["luma-scanner","cotizador-loan"]';
