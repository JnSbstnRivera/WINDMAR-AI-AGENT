# 🤖 WINDMAR AI AGENT (Sun Bot)

> Asistente de IA para el call center de Windmar Home PR — chat con SSO Microsoft, conocimiento del producto y herramientas integradas.

![Estado](https://img.shields.io/badge/Estado-Producci%C3%B3n-2ea043)
![Stack](https://img.shields.io/badge/Stack-Next.js%2015%20%2B%20React%2019%20%2B%20TypeScript-1D429B)
![Deploy](https://img.shields.io/badge/Deploy-Vercel-000?logo=vercel)
![Windmar](https://img.shields.io/badge/Windmar-Home%20PR-F89B24)

🌐 **Producción:** https://windmar-ai-agent.vercel.app

---

## 🎯 ¿Qué hace?

Sun Bot es el agente de IA del call center de Windmar Home PR. Es un chat con login corporativo (Microsoft Entra ID) que responde dudas de los asesores sobre el producto, recomienda el cotizador correcto, genera coaching de ventas y — lo más nuevo — **opera el CRM de Zoho por lenguaje natural** (tool-use): busca clientes, trae carteras de leads en tabla, agrega notas y reasigna leads, todo con permisos por rol. Incluye además un **panel administrativo ejecutivo** (métricas, gestión, asignación, auditoría, administración de usuarios y **configuración/salud de Zoho** — los mapeos de estados se editan sin redeploy).

App migrada del proyecto Vite original a Next.js. El motor LLM original era **Groq (`llama-3.3-70b-versatile`)** y actualmente corre sobre **Claude Haiku 4.5 (Anthropic)** vía `@anthropic-ai/sdk`, con prompt caching del SYSTEM_PROMPT, streaming y **tool-use agéntico** (loop de hasta 6 iteraciones) para las herramientas de Zoho.

> 🎬 **Presentación ejecutiva** del agente (deck HTML con el tema neón del dashboard): [`/presentacion.html`](https://windmar-ai-agent.vercel.app/presentacion.html)

> Sun Bot es una **PWA instalable**. El middleware de NextAuth debe excluir `manifest.webmanifest` y `sw.js` o no aparece el botón "Instalar".

---

## ✨ Características

- **Chat con IA** (Claude Haiku 4.5) con streaming de respuestas y typewriter a velocidad uniforme.
- **SSO Microsoft Entra ID** (NextAuth v5) — restricción a nivel de tenant Azure + callback `signIn`.
- **Knowledge base** en Supabase con extracción de keywords (stop words en español) para recuperar contexto relevante.
- **Herramientas del call center** administradas en Supabase (tabla `tools`): el LLM las recomienda según `triggers` + `topic` por dominio (solar, roofing, water, anker, ev, financiamiento, cierre, pre-venta, gestión, general) y el cliente las renderiza como cards (header `X-Recommended-Tools`).
- **Web search opt-in**: ciertas palabras clave (`investiga`, `busca online`, `noticias`, `tarifa actual`, `última versión`, etc.) activan la herramienta `web_search` de Anthropic (`web_search_20250305`, `max_uses: 3`).
- **Cards de matriz de calidad**: detección de intent (`matrix` · `criticals` · `times`) para renderizar cards visuales (INICIO 30% · ACTITUD 50% · SEG 20%, 8 items críticos, tiempos de espera por área).
- **Subida de documentos** (`/api/upload-document`) — analiza imágenes/PDF con Claude (el archivo se manda a Anthropic y se descarta, no se persiste).
- **Agente Zoho CRM en lenguaje natural** (tool-use) — el LLM decide y ejecuta herramientas server-side. El asesor **gestiona su cartera** desde el chat (no solo consulta):
  - `buscar_cliente` — por email/teléfono/nombre/Lead#/deal; encuentra hasta clientes **convertidos** (Contacto + Deal sin lead). Devuelve **ficha rica estructurada** (`ClientCardChat`), no texto que el modelo redacte.
  - `mis_leads` — la cartera como **tarjeta rica** (`LeadsCard`, móvil-friendly) con estado por color, última nota y botones; filtros por cantidad, orden, estado y fechas; triage "sin nota en 24h". Los líderes pueden pedir la cartera de **cualquier asesor** por su nombre completo.
  - **Escrituras del asesor con confirmación de 1 clic** — `agregar_nota`, `actualizar_estado`, `programar_seguimiento`. **Disponibles para todos pero scoped** a SU cartera (`ownsLead`). Patrón **preparar→confirmar**: NO tocan Zoho hasta que el asesor da clic en la tarjeta (`ZohoActionCard`) → `POST /api/zoho/action` re-valida dueño + audita. Notas con plantillas + firma `🤖☀️ SUN BOT`.
  - **Flujos compuestos** — *"no contestó, lo llamo mañana 10am"* prepara estado + seguimiento en **una sola tarjeta** con un único Confirmar (`makeCompoundAction`).
  - `asignar_leads` — reasignación masiva de Owner. **Solo roles elevados.**
  - **Resolución de asesor sin ambigüedad** (`resolveAsesor`): si un nombre matchea a varios usuarios (ej. "juan" → 12 tocayos), el agente **pide elegir**; "mis leads" resuelve al **propio usuario** por email→ID exacto. Mata el bug de carteras cruzadas.
  - **Estados de venta reales**: un Deal = **contrato firmado** (pago a la 1ra firma → "Caso Vendido"); solo `Cancelled` es pérdida (`dealStateOf`/`isDealCompleted`). Antes usaba "Closed Won/Lost" (inexistentes) → `sistemaComprado` salía siempre vacío.
  - **Tarjetas estructuradas, no markdown** — listas y fichas viajan como datos (`<zoho_leads>` / `<zoho_client>` / `<zoho_action>` en el stream) y el cliente las pinta; el modelo solo agrega coaching. Resolvió el bug "aquí están tus 29 leads" sin mostrarlos.
  - **Mapeos editables sin deploy** (`zoho_status_map`, `zoho_deal_stage_map`, `zoho-config.ts`, cache 5 min + fallback a defaults) + **telemetría** (`zoho_query_log`).
- **☀️ Briefing matutino** — al abrir el chat, `BriefingCard` muestra **citas de hoy + seguimientos vencidos + accionables** (campos nativos `Presenter_Appointment` / `Llamar_de_esta_fecha`). Endpoint `/api/zoho/briefing` (rápido, sin consultar notas).
- **🎙️ Dictado por voz** — botón de micrófono con Web Speech API nativa del navegador (gratis, on-device, español; Edge/Chrome). El texto reconocido cae en el input.
- **📞 Llamar 3CX / Kixie** — dos botones por lead/ficha que lanzan el softphone (3CX vía `callto:`, Kixie vía `tel:`; `lib/dialer.ts`).
- **Coach de ventas IA** — sugerencias de qué ofrecer según el cliente y sus deals, como chips accionables.
- **Envío de correos** de seguimiento al cliente (Microsoft Graph, firma corporativa, autocompletar desde Zoho). Atajo: ícono de **sobre** en la barra del chat (además de `/@`).
- **Panel administrativo** (tema ejecutivo neón, allowlist por email):
  - **Dashboard** — KPIs, gráficas de uso, departamentos, hora pico, satisfacción y comparativas (Recharts).
  - **Gestión** (`/admin/gestion`) — chat con el agente Zoho por lenguaje natural para líderes.
  - **Asignar** (`/admin/asignar`) — tablero para ver y reasignar carteras, con búsqueda manual de usuarios de Zoho.
  - **Usuarios** (`/admin/usuarios`) — aprobar/rechazar ingresos **y agregar usuarios manualmente** (correo, nombre, área, rol; quedan pre-aprobados). Roles y suspensión/eliminación con **jerarquía Super Admin**.
  - **Zoho** (`/admin/zoho`) — **configuración y salud del agente Zoho**: editor de mapeos (qué estados de lead cuentan en cada grupo, qué etapas de deal son venta/completado) que aplica sin redeploy, + dashboard de salud con latencia p50/p95, % de error, consultas por herramienta y errores recientes (RPC `admin_zoho_health`).
  - **Auditoría** (`/admin/auditoria`) — registro append-only (`admin_audit`) de accesos, notas y asignaciones.
- **Multidominio** — login para `@windmarhome.com` y `@windmarenergy.com` (extensible vía `ALLOWED_EMAIL_DOMAINS`).
- **Comandos `/` (easter eggs)** sin gastar tokens (texto fijo, no llaman al LLM).

### Comandos `/` del chat

| Comando | Acción |
|---|---|
| `/sobre` | Lista todos los comandos secretos |
| `/@` · `/seguimiento` · `/correos` | Envía correo de seguimiento al cliente 📧 |
| `/zoho {email\|teléfono\|nombre\|Lead#}` | Busca cliente en Zoho + coach IA 🔍 (alias: `/cliente`, `/lead`) |
| `/sunbot` | Saludo del SUN BOT |
| `/temblor` | Protocolo sísmico PR |
| `/snake` | Mini-juego serpiente |
| `/pong` | Pong vs IA |
| `/invaders` | Space Invaders solar |
| `/play` o `/juego` | Alias del de arriba |

---

## 🛠️ Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 + React 19 + TypeScript |
| Autenticación | NextAuth v5 + Microsoft Entra ID (SSO Windmar) |
| Base de datos | Supabase (`conversations`, `messages`, `knowledge_base`, `user_roles`, `tools`, `admin_audit`, `zoho_status_map`, `zoho_deal_stage_map`, `zoho_query_log`) |
| Motor LLM | Claude Haiku 4.5 (Anthropic, `@anthropic-ai/sdk`) — migrado desde Groq (`llama-3.3-70b-versatile`) |
| CRM | Zoho CRM (Self Client) |
| UI/Markdown | react-markdown + remark-gfm, recharts |
| Estilos | Tailwind CSS v4 |
| Deploy | Vercel |

> **Nota Anthropic:** Claude Code scrubea `ANTHROPIC_API_KEY`. El endpoint de coach (`/api/zoho/coach`) usa `WH_CLAUDE_KEY || ANTHROPIC_API_KEY`. Comparte la cuenta/API key de Anthropic con **LUMA-SCANNER** (TPM compartido de la cuenta).

---

## 📁 Estructura del repositorio

```
windmar-ai-agent-next/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts    # NextAuth handlers
│   │   │   ├── chat/route.ts                  # Chat con Claude Haiku 4.5 (antes Groq)
│   │   │   ├── conversations/route.ts         # CRUD conversaciones
│   │   │   ├── conversations/[id]/route.ts    # DELETE individual
│   │   │   ├── conversations/search/route.ts  # Búsqueda de conversaciones
│   │   │   ├── messages/route.ts              # Guardar mensajes
│   │   │   ├── profile/route.ts               # Update user_roles
│   │   │   ├── profile/onboarding/route.ts    # Onboarding de perfil
│   │   │   ├── upload-document/route.ts       # Análisis de docs/imágenes con Claude
│   │   │   ├── email/send/route.ts            # Envío de correo de seguimiento
│   │   │   ├── feedback/route.ts              # Feedback de respuestas
│   │   │   ├── admin/metrics/route.ts         # Métricas (panel admin)
│   │   │   ├── admin/conversation/[id]/route.ts  # Conversación individual (admin)
│   │   │   ├── admin/users/route.ts           # Aprobar/rechazar/suspender/eliminar + CREATE (alta manual)
│   │   │   ├── admin/zoho-sync/route.ts       # Resuelve y guarda zoho_user_id de cada asesor
│   │   │   ├── admin/zoho-users/route.ts      # Lista usuarios activos de Zoho (asignación)
│   │   │   ├── admin/zoho/config/route.ts     # GET/POST mapeos editables (status→bucket, stage→estado)
│   │   │   ├── admin/zoho/health/route.ts     # Salud del agente Zoho (RPC admin_zoho_health)
│   │   │   ├── zoho/search/route.ts           # Búsqueda de cliente en Zoho
│   │   │   ├── zoho/client/route.ts           # Detalle de cliente Zoho
│   │   │   ├── zoho/coach/route.ts            # Coach de ventas IA
│   │   │   ├── zoho/my-leads/route.ts         # Cartera de leads (propia o de un asesor)
│   │   │   ├── zoho/assign/route.ts           # Reasignación masiva de Owner (gateado)
│   │   │   ├── zoho/note/route.ts             # Crear nota en lead (gateado)
│   │   │   ├── zoho/action/route.ts           # Ejecuta escritura confirmada (nota/estado/seguimiento/compound) scoped+auditada
│   │   │   └── zoho/briefing/route.ts         # Briefing del asesor (citas hoy + seguimientos vencidos)
│   │   ├── admin/page.tsx                     # Dashboard ejecutivo (KPIs + gráficas)
│   │   ├── admin/layout.tsx                   # Layout neón + allowlist server-side
│   │   ├── admin/gestion/page.tsx            # Chat de gestión con el agente Zoho
│   │   ├── admin/asignar/page.tsx            # Tablero de asignación de carteras
│   │   ├── admin/auditoria/page.tsx          # Visor del registro admin_audit
│   │   ├── admin/usuarios/page.tsx           # Aprobar + agregar usuarios + roles
│   │   ├── admin/zoho/page.tsx               # Config Zoho: mapeos editables + dashboard de salud
│   │   ├── login/page.tsx                     # Botón Microsoft
│   │   ├── layout.tsx                         # Esqueleto HTML
│   │   ├── globals.css                        # Estilos globales (Tailwind v4)
│   │   └── page.tsx                           # Home (chat principal)
│   ├── components/
│   │   ├── ChatApp.tsx                        # Lógica principal del chat
│   │   ├── ChatInput.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── ChatWindow.tsx
│   │   ├── MascotPanel.tsx                    # SUN BOT
│   │   ├── ZohoActionCard.tsx                 # Tarjeta de confirmación de escritura (1 clic) + compound
│   │   ├── LeadsCard.tsx                      # Lista de leads como tarjeta rica (móvil-friendly)
│   │   ├── ClientCardChat.tsx                 # Ficha de cliente rica + acciones 1-clic
│   │   ├── BriefingCard.tsx                   # Briefing matutino al abrir el chat
│   │   ├── ProfileModal.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── WelcomeScreen.tsx
│   ├── hooks/
│   │   └── useTypewriter.ts                   # Typewriter de velocidad uniforme
│   ├── lib/
│   │   ├── supabase.ts                        # Cliente admin
│   │   ├── prompts.ts                         # SYSTEM_PROMPT del LLM
│   │   ├── tools.ts                           # Herramientas del call center (tabla `tools`)
│   │   ├── zoho.ts                            # Cliente Zoho (search, leads, deals, assign, note, resolveAsesor)
│   │   ├── zoho-agent-tools.ts                # Defs + executor de las tools del agente (tool-use) + telemetría
│   │   ├── zoho-access.ts                     # Scoping por rol (ViewerScope, canWrite, ownsLead)
│   │   ├── zoho-status.ts                     # Defaults puros: Lead_Status→bucket, Deal Stage→estado (client-safe)
│   │   ├── zoho-config.ts                     # Server-only: mapeos desde Supabase (cache 5min + fallback) + logZohoQuery
│   │   ├── zoho-actions.ts                    # Acciones de escritura (tipos + serialize/extract <zoho_action> + compound)
│   │   ├── zoho-leads-card.ts                 # Tarjeta estructurada de lista de leads (<zoho_leads>)
│   │   ├── zoho-client-card.ts                # Tarjeta estructurada de ficha de cliente (<zoho_client>)
│   │   ├── quick-replies.ts                   # Extractor compartido de <quick_replies> (chat + admin)
│   │   ├── dialer.ts                          # Click-to-call 3CX (callto:) / Kixie (tel:)
│   │   ├── admin-auth.ts                      # Allowlist admin + super admin (por email)
│   │   ├── audit.ts                           # logAudit() → admin_audit
│   │   ├── email-templates.ts                # Plantillas de correo
│   │   ├── access-notify.ts                   # Aviso a admins de acceso nuevo
│   │   └── easter-eggs.ts                     # Comandos / del chat
│   ├── auth.ts                                # Config NextAuth
│   ├── middleware.ts                          # Protección de rutas (excluye manifest/sw.js — PWA)
│   └── types.ts
├── supabase/migrations/
│   ├── 004_user_roles.sql
│   ├── 005_conversations_email.sql
│   ├── 006_tools.sql
│   ├── 007_calidad_y_enseres.sql
│   ├── 008_admin_filter_all_periods.sql
│   ├── 009_usage_by_month_for_all.sql
│   ├── 010_usage_by_month_only_active.sql
│   ├── 011_admin_with_photos.sql
│   ├── 012_access_control.sql                 # status/pending, approve flow
│   ├── 013_admin_audit.sql                    # tabla admin_audit (append-only)
│   ├── 014_relax_departamento.sql             # área de texto libre (RH, etc.)
│   ├── 015_zoho_config.sql                    # zoho_status_map + zoho_deal_stage_map + zoho_query_log (+seeds)
│   └── 016_admin_zoho_health.sql              # RPC admin_zoho_health (latencia p50/p95, % error)
├── public/                                     # Imágenes (sunbot, logo)
├── .env.local                                  # Variables locales (NO Git)
├── .env.example                                # Plantilla
├── vercel.json
└── package.json
```

---

## 🔧 Variables de entorno

Copia `.env.example` a `.env.local` y rellena los valores (`.env.local` NO se sube a Git).

```bash
# ─── NEXTAUTH (sesiones encriptadas) ───
# Genera con: npx auth secret
AUTH_SECRET=<ya_generado_no_tocar>

# ─── MICROSOFT ENTRA ID — pedírselo a IT ───
AUTH_MICROSOFT_ENTRA_ID_ID=<APPLICATION_CLIENT_ID_DE_AZURE>
AUTH_MICROSOFT_ENTRA_ID_SECRET=<CLIENT_SECRET_VALUE_DE_AZURE>   # el VALUE, no el ID del secret
# Acepta solo el tenant ID (UUID) o https://login.microsoftonline.com/<TENANT_ID>/v2.0
AUTH_MICROSOFT_ENTRA_ID_ISSUER=<TENANT_ID>

# ─── ACCESO (opcionales — SUMAN a los valores hardcoded, no los reemplazan) ───
# Dominios extra permitidos para login (coma-separados). Hardcoded: windmarhome.com, windmarenergy.com
ALLOWED_EMAIL_DOMAINS=
# Admins extra del panel /admin (coma-separados). Hardcoded en src/lib/admin-auth.ts
ADMIN_EMAILS=
# Super admins extra (gestionan a otros admins). Hardcoded: juan.s@windmarhome.com
SUPERADMIN_EMAILS=

# ─── SUPABASE (server-side — knowledge base + conversations) ───
SUPABASE_URL=https://psyfmkmlmvrijdxsirph.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<copiar_del_dashboard_de_supabase>

# ─── MOTOR DE IA ───
# Legacy: GROQ_API_KEY (motor original llama-3.3-70b-versatile)
GROQ_API_KEY=<copiar_del_proyecto_viejo>
# Actual: Claude Haiku 4.5 (Anthropic). Compartida con LUMA-SCANNER.
ANTHROPIC_API_KEY=<api_key_anthropic>
# Alias usado por /api/zoho/coach (Claude Code scrubea ANTHROPIC_API_KEY)
WH_CLAUDE_KEY=<api_key_anthropic_alias>

# ─── ZOHO CRM — para el comando /cliente ───
# Self Client de Zoho con scopes:
#   ZohoCRM.modules.leads.READ
#   ZohoCRM.modules.deals.READ
#   ZohoCRM.users.READ
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
ZOHO_REFRESH_TOKEN=
ZOHO_ORG_ID=699641359
# Opcional — datacenter de Zoho. US (default): https://www.zohoapis.com · EU: .eu · IN: .in
ZOHO_API_DOMAIN=https://www.zohoapis.com
```

> **Service role key:** Supabase Dashboard → Settings → API → `service_role` key (la secreta, NO la `anon`).

### Cómo generar el Self Client de Zoho

1. Ir a https://api-console.zoho.com
2. "Self Client" → "Generate Code"
3. Scopes: pegar los 3 de arriba (separados por comas)
4. Time Duration: 10 minutes
5. Copia el `grant_code` y úsalo en el comando curl de `README-ZOHO.md`
6. Obtienes `refresh_token` (largo, no expira)

> Ya tienes el Client ID/Secret aprobados en **NOTAS-VENTAS-VASS** — puedes reutilizarlos o generar un Self Client nuevo (recomendado: tokens independientes para que revocar uno no afecte al otro).

---

## 🚀 Setup local

### 1. Rellenar `.env.local`

Ver sección [Variables de entorno](#-variables-de-entorno).

### 2. Ejecutar migraciones SQL en Supabase

En orden, en el SQL Editor de Supabase:

1. `supabase/migrations/004_user_roles.sql` — crea tabla `user_roles` y migra metadata existente
2. `supabase/migrations/005_conversations_email.sql` — agrega columna `user_email` a conversations
3. `supabase/migrations/006_tools.sql` — tabla `tools` (herramientas del call center)
4. `supabase/migrations/007_calidad_y_enseres.sql`
5. `supabase/migrations/008_admin_filter_all_periods.sql`
6. `supabase/migrations/009_usage_by_month_for_all.sql`
7. `supabase/migrations/010_usage_by_month_only_active.sql`
8. `supabase/migrations/011_admin_with_photos.sql`
9. `supabase/migrations/012_access_control.sql` → `016_admin_zoho_health.sql` — en orden (control de acceso, auditoría, áreas libres, config Zoho editable + telemetría, RPC de salud)

### 3. Probar localmente

```powershell
npm run dev
```

Abre http://localhost:3000 → debería redirigir a `/login` → click "Iniciar sesión con Microsoft" → autenticarte → vuelves al chat.

### Comandos útiles

```powershell
npm run dev      # Servidor de desarrollo (localhost:3000)
npm run build    # Build de producción
npm run start    # Correr build en local (después de build)
npm run lint     # Linter
```

---

## 📦 Despliegue

Deploy en Vercel (`vercel.json`: framework `nextjs`, build `next build`, output `.next`, install `npm install`).

**Variables de entorno en Vercel** (Project Settings → Environment Variables): las mismas que `.env.local`. Asegúrate que `AUTH_MICROSOFT_ENTRA_ID_ISSUER` es el tenant ID correcto.

**Confirmar con IT** que el redirect URI registrado en Azure es:

```
https://windmar-ai-agent.vercel.app/api/auth/callback/microsoft-entra-id
```

---

## 🔄 Diferencias importantes vs. el proyecto viejo (Vite)

| Aspecto | Antes (Vite) | Ahora (Next.js) |
|---|---|---|
| **Login** | Email + password en Supabase Auth | Botón "Iniciar sesión con Microsoft" |
| **Sesiones** | Token Supabase | JWT cifrado (cookie 8h) |
| **Restricción** | Validación frontend de @windmarhome.com | A nivel de tenant Azure + callback signIn |
| **Conversaciones** | `user_id` UUID | `user_email` TEXT |
| **Profile data** | `auth.users.user_metadata` | Tabla `user_roles` |
| **Acceso a DB** | Supabase anon key con RLS | service_role key bypass |
| **Endpoint chat** | `api/chat.ts` (Vercel function) | `app/api/chat/route.ts` (Next.js) |

---

## 🔗 Ecosistema Windmar

Parte del ecosistema de herramientas de Windmar Home PR (dueño **JnSbstnRivera**).

- **Repo:** https://github.com/JnSbstnRivera/WINDMAR-AI-AGENT
- **Hub padre:** [PANEL-DE-HERRAMIENTAS-CALL-CENTER](https://github.com/JnSbstnRivera/PANEL-DE-HERRAMIENTAS-CALL-CENTER)
- **Comparte cuenta/API key de Anthropic con:** [LUMA-SCANNER](https://github.com/JnSbstnRivera/LUMA-SCANNER)
- **Reutiliza credenciales Zoho de:** [NOTAS-VENTAS-VASS](https://github.com/JnSbstnRivera/NOTAS-VENTAS-VASS)

---

## 📄 Créditos

Desarrollado por **JnSbstnRivera** (Juan Sebastián Rivera Joven) para **Windmar Home Puerto Rico**. ☀️
