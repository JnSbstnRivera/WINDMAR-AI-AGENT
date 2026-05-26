# 🤖 GUÍA MAESTRA — Replica el Chat IA de Windmar para tu área (AI-DLC)

> **Para el desarrollador que recibe este archivo:** este documento es tu plano completo para construir un copiloto IA de call center como el que ya corre en Puerto Rico (WINDMAR-AI-AGENT). Ponlo en la raíz de tu repo nuevo. Tu Claude (Claude Code) lo leerá y te guiará paso a paso.
>
> **Para el Claude que lee este archivo:** este documento te convierte en un guía AI-DLC. NO empieces a codear. Primero sigue el protocolo de la **PARTE 0**. Tu trabajo es entrevistar al usuario sobre su área, adaptar la arquitectura de referencia (PR) a su realidad, y construir el mejor chat posible para ellos.

---

## 📑 Índice

- **PARTE 0** — Instrucciones para el agente IA (protocolo AI-DLC) ← *Claude empieza aquí*
- **PARTE 1** — Qué es este proyecto (la visión)
- **PARTE 2** — Arquitectura técnica de referencia (PR)
- **PARTE 3** — El proceso AI-DLC para TU área (las 3 fases)
- **PARTE 4** — Setup técnico paso a paso
- **PARTE 5** — Qué personalizar para tu área
- **PARTE 6** — Checklist de lanzamiento

---

# PARTE 0 — Instrucciones para el agente IA (protocolo AI-DLC)

> **Claude: lee esta sección completa antes de hacer NADA. Es tu manual de operación.**

## Tu rol

Eres un agente siguiendo **AI-DLC** (AI-Driven Development Life Cycle, metodología de AWS Labs). Tu misión: ayudar a este usuario a construir un copiloto IA para su área de la empresa, usando el chat de Puerto Rico como referencia arquitectónica.

**La regla de oro de AI-DLC:** NO saltes a codear. Primero pregunta, planea, diseña y pide aprobación en cada etapa.

## Lo primero que haces (mensaje de bienvenida)

Cuando el usuario te diga algo como *"ayúdame a crear mi chat"* o *"vamos con la guía"*, responde con un mensaje de bienvenida que:

1. Confirma que vas a seguir AI-DLC (proceso estructurado, no improvisado)
2. Explica que primero le harás preguntas para entender su área
3. Le adelanta que luego verá un plan que debe aprobar antes de construir

Luego arranca **inmediatamente** con la **Fase Inception** (PARTE 3).

## Cómo haces preguntas (formato obligatorio)

Las preguntas son **multiple-choice**, no abiertas. Formato:

```
PREGUNTA 1: ¿De qué área es tu chat?
  A) Ventas / Telemercadeo
  B) Soporte técnico / Servicio al cliente
  C) Cobranzas / Finanzas
  D) Recursos Humanos / Interno
  E) Otra (descríbela)

[Respuesta]:
```

El usuario contesta con la letra. Si elige "Otra" o algo ambiguo, pides aclaración antes de seguir.

## Las 3 fases que vas a recorrer

| Fase | Pregunta clave | Output |
|------|---------------|--------|
| 🔵 **Inception** | ¿QUÉ chat y POR QUÉ? | Entiendes el área, defines alcance |
| 🟢 **Construction** | ¿CÓMO construirlo? | Adaptas código + llenas Supabase |
| 🟡 **Operations** | ¿Cómo desplegarlo? | Deploy en Vercel + verificación |

## Reglas de comportamiento (no negociables)

1. **Pide aprobación entre fases.** No pases de Inception a Construction sin un "sí, dale".
2. **Documenta decisiones.** Crea una carpeta `aidlc-docs/` y guarda ahí: `requirements.md` (qué quiere el área), `personalizacion.md` (qué se cambió vs. PR), `decisiones.md` (por qué). Esto deja trazabilidad.
3. **No inventes el contenido del área.** El knowledge base, las herramientas, el tono — todo eso lo define el usuario. Tú preguntas, ellos responden.
4. **Workflow adaptativo.** Si el usuario ya tiene parte hecho, sáltate lo que no aplica. Un setup desde cero pasa por todo; un ajuste no.
5. **Hereda la REGLA SUPREMA si aplica.** El chat de PR NUNCA da precios concretos (ver PARTE 2). Pregunta al usuario si su área tiene una restricción equivalente.

---

# PARTE 1 — Qué es este proyecto (la visión)

## El problema que resuelve

Un call center tiene asesores que, durante una llamada en vivo, necesitan respuestas rápidas: argumentos de venta, datos de producto, qué herramienta usar, cómo manejar una objeción. Buscar eso en manuales o preguntarle al supervisor toma tiempo y se pierde la llamada.

**La solución:** un copiloto IA que el asesor consulta en tiempo real. Conoce todo el conocimiento del área, recomienda las herramientas correctas, y responde como un colega experto — sin que el asesor cuelgue la llamada.

## Qué hace el chat de PR (referencia)

- **Responde preguntas** del asesor con conocimiento curado del negocio (RAG sobre Supabase)
- **Recomienda herramientas** (cotizadores, calculadoras) con tarjetas clickeables según el tema
- **Analiza documentos** que el asesor sube (facturas, IDs, contratos) con visión IA
- **Envía correos de seguimiento** al cliente desde el Outlook del asesor (Microsoft Graph)
- **Coaching de calidad** — explica la matriz de calidad de llamada
- **Dashboard admin** — métricas de uso, satisfacción, conversaciones (auditoría)
- **SSO corporativo** — solo entran empleados del dominio de la empresa

## La filosofía

El chat NO reemplaza al asesor — lo potencia. Habla como un colega, no como un manual. Es rápido (Claude Haiku), barato (prompt caching), y trazable (todo queda auditado).

---

# PARTE 2 — Arquitectura técnica de referencia (PR)

> Esta es la arquitectura del chat que ya funciona. Tu área va a clonar esta base y personalizar el contenido.

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js | 15.5.x (App Router) |
| UI | React + TypeScript | 19.2.x / 5.8.x |
| Estilos | Tailwind CSS | 4.1.x |
| Auth | NextAuth (Auth.js) + Microsoft Entra ID | 5.0.0-beta |
| Base de datos | Supabase (PostgreSQL) | cliente 2.49.x |
| Modelo IA | Anthropic Claude Haiku 4.5 | SDK 0.95.x |
| Gráficas (admin) | Recharts | 3.8.x |
| Deploy | Vercel | — |
| Correo | Microsoft Graph API (sendMail) | — |

## Estructura de carpetas

```
tu-repo/
├── src/
│   ├── auth.ts                    # NextAuth + Microsoft SSO + refresh tokens
│   ├── lib/
│   │   ├── supabase.ts            # Cliente admin de Supabase (server-side)
│   │   ├── prompts.ts             # SYSTEM_PROMPT — el cerebro del bot ⭐
│   │   ├── tools.ts               # Motor de recomendación de herramientas
│   │   ├── email-templates.ts     # Plantillas de correo de seguimiento
│   │   ├── easter-eggs.ts         # Comandos /sunbot /temblor /sobre, etc.
│   │   └── admin-auth.ts          # Allowlist de admins
│   ├── app/
│   │   ├── page.tsx               # Home (chat principal)
│   │   ├── login/page.tsx         # Login SSO
│   │   ├── admin/                 # Dashboard de métricas
│   │   └── api/
│   │       ├── chat/route.ts            # POST — genera respuesta IA (streaming) ⭐
│   │       ├── conversations/route.ts   # CRUD de conversaciones
│   │       ├── messages/route.ts        # Guardar mensajes
│   │       ├── feedback/route.ts        # 👍/👎
│   │       ├── upload-document/route.ts # Análisis de documentos (visión)
│   │       ├── email/send/route.ts      # Enviar correo vía Graph
│   │       └── admin/metrics/route.ts   # Métricas del dashboard
│   └── components/                # ~30 componentes React
│       ├── ChatApp.tsx            # Orquestador del chat
│       ├── ChatInput.tsx          # Caja de mensaje + adjuntar
│       ├── ChatWindow.tsx         # Lista de mensajes
│       ├── ToolCards.tsx          # Tarjetas de herramientas
│       ├── FollowUpEmailModal.tsx # Modal de correo
│       └── admin/                 # Componentes del dashboard
├── supabase/
│   └── migrations/                # SQL versionado (esquema + funciones)
├── public/                        # Assets (logos, mascota)
├── .env.example                   # Plantilla de variables de entorno
└── GUIA-MAESTRA-REPLICACION.md    # ← este archivo
```

⭐ = los archivos que MÁS vas a personalizar.

## Esquema de Supabase (tablas)

### `knowledge_base` — el conocimiento del área (lo más importante)
| Columna | Tipo | Qué es |
|---------|------|--------|
| id | uuid | PK |
| categoria | text | PRODUCTO_X, FINANCIAMIENTO, OBJECION_ARGUMENTO, PROCESO, etc. |
| subcategoria | text | Opcional, agrupa dentro de categoría |
| titulo | text | Título de la entrada |
| contenido | text | El conocimiento en sí (lo que el bot "sabe") |
| area | text | 'ALL' o un departamento específico |

> **Aquí va TODO lo que tu chat debe saber.** Cada fila es un pedazo de conocimiento. El bot busca aquí (RAG) antes de responder.

### `tools` — herramientas que el bot recomienda
| Columna | Tipo | Qué es |
|---------|------|--------|
| slug | text | ID único (ej. 'cotizador-loan') |
| name | text | Nombre visible |
| url | text | Link de la herramienta |
| description | text | Una línea para la tarjeta |
| when_to_use | text | Cuándo recomendarla (para el prompt) |
| triggers | text[] | Palabras clave que la activan |
| topic | text | Tema (solar, financiamiento, etc.) |
| icon | text | Emoji |
| recommend | boolean | Si el LLM la sugiere |
| active | boolean | Si está activa |

### `conversations` — hilos de chat
`id, user_email, title, created_at, updated_at, deleted_at (soft delete)`

### `messages` — mensajes individuales
`id, conversation_id, role (user/assistant), content, tool_refs[], created_at`

### `message_feedback` — votos 👍/👎
`id, user_email, conversation_id, message_content, rating (up/down), reason, created_at`

### `user_roles` — perfiles de empleados (auto-provisionado al login)
`id, user_email, display_name, departamento, rol, onboarded_at, photo_url`

### `email_sends` (opcional) — auditoría de correos enviados

### Funciones RPC (PostgreSQL)
- `search_knowledge(query, categoria, area, limit)` — búsqueda full-text para el RAG
- `admin_metrics_kpis(period)` — KPIs del dashboard
- `admin_usage_by_day(period)`, `admin_top_asesores(period)`, etc. — métricas

## El cerebro del bot (`prompts.ts` + `tools.ts`)

**`SYSTEM_PROMPT`** define cómo se comporta el bot:
- Su rol y personalidad
- El tono según el rol del empleado (asesor casual vs. líder formal)
- Inyección dinámica del knowledge base (top 8 entradas relevantes por turno)
- Reglas de negocio críticas (ej. la **REGLA SUPREMA** de PR: nunca dar precios concretos)
- Formato de respuesta (markdown, longitud según tipo de pregunta)

**`tools.ts`** decide qué herramientas recomendar:
- Detecta el tema del mensaje (keywords)
- Filtra las herramientas relevantes de la tabla `tools`
- Las inyecta al prompt y las devuelve como tarjetas al cliente

## Flujo de una pregunta

```
Asesor escribe → POST /api/chat
  → Verifica sesión (SSO)
  → Rate limit (30 msg/min)
  → search_knowledge() trae top 8 del knowledge base
  → detectTopic() + matchTools() eligen herramientas
  → Construye prompt: contexto del asesor + KB + tools + pregunta
  → Claude Haiku responde (streaming)
  → Devuelve texto + tarjetas de herramientas
  → Cliente guarda el mensaje en Supabase
```

## Autenticación (SSO)

- **Microsoft Entra ID** (Azure AD) vía NextAuth
- Solo entran correos del dominio corporativo (ej. `@windmarhome.com`)
- Scopes: `openid profile email offline_access User.Read Mail.Send`
- Al primer login: auto-provisiona el perfil en `user_roles` + onboarding (elige departamento/rol)
- Sesión de 8 horas (logout automático al fin del turno)

---

# PARTE 3 — El proceso AI-DLC para TU área (las 3 fases)

> **Claude: esta es tu guía de entrevista. Recorre las fases en orden, pidiendo aprobación entre cada una.**

## 🔵 FASE INCEPTION — Entender el área

Haz estas preguntas **una por una** (o en grupos pequeños), multiple-choice. Guarda las respuestas en `aidlc-docs/requirements.md`.

### Bloque A — Identidad del chat

```
PREGUNTA 1: ¿De qué área/región es tu chat?
  A) Ventas (otra región — ej. Florida)
  B) Soporte técnico / Servicio al cliente
  C) Cobranzas / Finanzas
  D) Recursos Humanos / Interno
  E) Otra (descríbela)

PREGUNTA 2: ¿Cómo se va a llamar el bot? (ej. "Sun Bot", "Asistente Florida")

PREGUNTA 3: ¿Cuál es el dominio de correo de tu área? (ej. @windmarfl.com)
  → Esto restringe quién puede entrar al chat.

PREGUNTA 4: ¿En qué idioma responde el bot?
  A) Español
  B) Inglés
  C) Bilingüe (detecta el idioma del asesor)
```

### Bloque B — El conocimiento (knowledge base)

```
PREGUNTA 5: ¿Qué tipo de conocimiento debe manejar tu bot? (elige todas las que apliquen)
  A) Productos / catálogo
  B) Argumentos de venta / manejo de objeciones
  C) Procesos internos / procedimientos
  D) Financiamiento / precios / planes
  E) Calidad de llamada / scripts
  F) Promociones vigentes
  G) Otro

PREGUNTA 6: ¿Tienes ese conocimiento ya documentado en algún lado?
  A) Sí, en Excel/documentos (los podemos importar)
  B) Sí, en otra base de datos
  C) Está en la cabeza del equipo (hay que escribirlo)
  D) Mezcla de todo lo anterior
```

### Bloque C — Reglas de negocio

```
PREGUNTA 7: ¿Hay información que el bot NUNCA debe dar?
  (En PR la REGLA SUPREMA es: nunca precios concretos, solo dirigir al cotizador.
   ¿Tu área tiene una restricción parecida?)
  A) Sí, precios/montos (igual que PR)
  B) Sí, otra cosa (descríbela)
  C) No, puede hablar de todo

PREGUNTA 8: ¿Qué roles de empleado existen en tu área?
  (En PR: Asesor, Líder, Channel, Project M — cada uno con tono distinto)
```

### Bloque D — Herramientas

```
PREGUNTA 9: ¿Tu área usa herramientas externas que el bot debería recomendar?
  (cotizadores, calculadoras, CRMs, formularios — con sus URLs)
  A) Sí (lista cuáles y sus links)
  B) No, solo conocimiento conversacional
```

### Bloque E — Features opcionales

```
PREGUNTA 10: ¿Qué features quieres activar? (elige todas)
  A) Análisis de documentos (subir foto/PDF → extraer datos)
  B) Envío de correos de seguimiento (requiere Microsoft 365)
  C) Dashboard de métricas para supervisores
  D) Comandos divertidos / easter eggs
  E) Solo el chat básico
```

**Al terminar Inception:**
1. Resume lo que entendiste en `aidlc-docs/requirements.md`
2. Muéstrale al usuario un resumen
3. **Pide aprobación**: *"¿Esto refleja lo que necesitas? ¿Avanzamos a construir?"*

---

## 🟢 FASE CONSTRUCTION — Construir el chat

Solo después de aprobar Inception. Documenta cambios en `aidlc-docs/personalizacion.md`.

### Paso 1 — Clonar la base
Copia la estructura del repo de PR (PARTE 2). El esqueleto técnico no cambia — Next.js, auth, API routes, componentes funcionan igual.

### Paso 2 — Personalizar el cerebro (`src/lib/prompts.ts`)
Reescribe el `SYSTEM_PROMPT` con:
- El nombre del bot (PREGUNTA 2)
- El idioma (PREGUNTA 4)
- Los roles de empleado y sus tonos (PREGUNTA 8)
- Las reglas de negocio / restricciones (PREGUNTA 7)
- El área y su contexto

### Paso 3 — Llenar el knowledge base (Supabase)
Esto es **lo más importante y lo hace el usuario** (con tu ayuda):
- Crea las migraciones de las tablas (PARTE 4)
- Por cada pieza de conocimiento (PREGUNTA 5/6), inserta una fila en `knowledge_base`
- Si tienen Excel/docs, ayúdalos a convertirlos a `INSERT`s
- Categoriza bien (categoria, subcategoria, area)

### Paso 4 — Cargar las herramientas (Supabase)
Si respondieron Sí a PREGUNTA 9:
- Inserta cada herramienta en la tabla `tools` con su slug, url, triggers, topic
- Ajusta `tools.ts` si los temas (topics) de tu área son distintos a los de PR

### Paso 5 — Branding
- Reemplaza logos y mascota en `public/`
- Ajusta colores en `globals.css` y componentes (PR usa naranja/navy Windmar)
- Cambia textos de login y bienvenida

### Paso 6 — Activar/desactivar features (PREGUNTA 10)
- Si NO quieren correos: quita el botón y el endpoint `email/send`
- Si NO quieren documentos: quita `upload-document`
- Si NO quieren dashboard: quita `/admin`

**Al terminar Construction:**
- Prueba el chat en local (`npm run dev`)
- **Pide aprobación** antes de desplegar

---

## 🟡 FASE OPERATIONS — Desplegar

### Paso 1 — Supabase
1. Crea un proyecto nuevo en supabase.com (cada área tiene SU propia base)
2. Ejecuta las migraciones SQL en el SQL Editor
3. Copia la URL y el service role key

### Paso 2 — Microsoft Entra (si usan SSO/correo)
- IT registra la app en Azure AD del tenant del área
- Configura redirect URIs (localhost + URL de producción)
- Da el client_id, secret, tenant_id

### Paso 3 — Vercel
1. Conecta el repo a Vercel
2. Agrega todas las variables de entorno (PARTE 4)
3. Deploy automático en cada push a `main`

### Paso 4 — Verificación
Usa el checklist de la PARTE 6.

---

# PARTE 4 — Setup técnico paso a paso

## Variables de entorno (`.env.local`)

```bash
# NextAuth + Microsoft Entra ID (SSO)
AUTH_SECRET=                          # Genera con: npx auth secret
AUTH_MICROSOFT_ENTRA_ID_ID=           # Client ID (de IT/Azure)
AUTH_MICROSOFT_ENTRA_ID_SECRET=       # Client Secret (de IT/Azure)
AUTH_MICROSOFT_ENTRA_ID_ISSUER=       # Tenant ID o URL del issuer

# Supabase (tu propia base)
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=            # Service role key (server-side, secreto)

# Anthropic (Claude)
ANTHROPIC_API_KEY=                    # API key de console.anthropic.com
# Nota: si corres con Claude Code, usa un nombre alterno (ej. WH_CLAUDE_KEY)
# porque Claude Code limpia la variable ANTHROPIC_API_KEY del entorno.

# Admins del dashboard (opcional)
ADMIN_EMAILS=admin1@tudominio.com,admin2@tudominio.com

# URL pública (para firmas de correo)
NEXT_PUBLIC_APP_URL=https://tu-chat.vercel.app
```

## Migraciones de Supabase

Ejecuta en el SQL Editor de Supabase, en orden. El esquema base:

```sql
-- 1. Perfiles de empleados
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text UNIQUE NOT NULL,
  display_name text,
  departamento text,
  rol text DEFAULT 'Asesor',
  onboarded_at timestamptz,
  photo_url text,
  assigned_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Conocimiento (RAG)
CREATE TABLE knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria text NOT NULL,
  subcategoria text,
  titulo text NOT NULL,
  contenido text NOT NULL,
  area text DEFAULT 'ALL',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Herramientas
CREATE TABLE tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  description text,
  when_to_use text,
  triggers text[],
  topic text,
  category text,
  icon text,
  is_official boolean DEFAULT false,
  recommend boolean DEFAULT true,
  active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 4. Conversaciones
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  title text,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Mensajes
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id),
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  tool_refs text[],
  created_at timestamptz DEFAULT now()
);

-- 6. Feedback
CREATE TABLE message_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  conversation_id uuid,
  message_content text,
  rating text NOT NULL CHECK (rating IN ('up','down')),
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Función de búsqueda para el RAG
CREATE OR REPLACE FUNCTION search_knowledge(
  search_query text,
  filter_categoria text DEFAULT NULL,
  filter_area text DEFAULT NULL,
  result_limit int DEFAULT 8
)
RETURNS SETOF knowledge_base
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM knowledge_base kb
  WHERE (filter_categoria IS NULL OR kb.categoria = filter_categoria)
    AND (filter_area IS NULL OR kb.area = filter_area OR kb.area = 'ALL')
    AND (
      kb.titulo ILIKE '%' || search_query || '%'
      OR kb.contenido ILIKE '%' || search_query || '%'
    )
  LIMIT result_limit;
END;
$$;
```

> Las funciones del dashboard admin (`admin_metrics_kpis`, etc.) están en las migraciones 008-010 del repo de PR — cópialas tal cual si quieres el dashboard.

## Comandos

```bash
npm install        # Instalar dependencias
npm run dev        # Correr en local (localhost:3000)
npm run build      # Build de producción
```

---

# PARTE 5 — Qué personalizar para tu área

| Pieza | Archivo | Qué cambiar |
|-------|---------|-------------|
| **Cerebro del bot** | `src/lib/prompts.ts` | Nombre, idioma, roles, reglas, tono |
| **Conocimiento** | tabla `knowledge_base` | TODO el contenido de tu área |
| **Herramientas** | tabla `tools` | Tus cotizadores/herramientas con URLs |
| **Dominio SSO** | `src/auth.ts` | Cambia `@windmarhome.com` por tu dominio |
| **Branding** | `public/`, `globals.css` | Logos, mascota, colores |
| **Login** | `src/app/login/page.tsx` | Nombre del bot, textos |
| **Plantillas correo** | `src/lib/email-templates.ts` | Firma, plantillas de tu área |
| **Comandos** | `src/lib/easter-eggs.ts` | Tus propios easter eggs |

## Lo que NO debes cambiar (el esqueleto)

- La estructura de API routes (`chat`, `conversations`, `messages`, etc.)
- El flujo de autenticación (solo el dominio)
- El motor de RAG y recomendación de herramientas
- Los componentes de chat (`ChatApp`, `ChatWindow`, etc.)

> Estos funcionan igual para cualquier área. Solo cambias el **contenido** y el **branding**, no la **mecánica**.

---

# PARTE 6 — Checklist de lanzamiento

## Antes de desplegar
- [ ] Knowledge base cargado (mínimo 30-50 entradas para que sea útil)
- [ ] Herramientas cargadas con URLs correctas (si aplica)
- [ ] SYSTEM_PROMPT personalizado con el nombre, idioma y reglas del área
- [ ] Dominio SSO cambiado en `auth.ts`
- [ ] Branding actualizado (logos, colores)
- [ ] Variables de entorno en Vercel
- [ ] Migraciones ejecutadas en Supabase
- [ ] `npm run build` pasa sin errores

## Pruebas funcionales
- [ ] Login con SSO funciona (solo dominio correcto entra)
- [ ] El bot responde con conocimiento del área (no genérico)
- [ ] Las herramientas aparecen cuando corresponde
- [ ] La regla de negocio se respeta (ej. no da info prohibida)
- [ ] El dashboard admin carga (si lo activaron)
- [ ] Correos se envían (si lo activaron)

## Post-lanzamiento
- [ ] Monitorea los downvotes (👎) en el dashboard — ahí ves qué falla
- [ ] Ajusta el knowledge base según las preguntas reales de los asesores
- [ ] Itera el SYSTEM_PROMPT cuando notes respuestas flojas

---

## 🎯 Recordatorio final para Claude

Tu objetivo no es solo "clonar el chat de PR". Es construir **el mejor chat posible para ESTA área**, entendiendo sus necesidades reales mediante el proceso AI-DLC. Pregunta, escucha, documenta, construye y verifica. El usuario es el experto de su área — tú eres el arquitecto que traduce ese conocimiento en un copiloto que sus asesores van a amar usar.

**Empieza preguntando. No codees todavía.** 🚀

---

*Documento maestro generado desde WINDMAR-AI-AGENT (versión Puerto Rico) · Metodología AI-DLC (AWS Labs) · 2026*
