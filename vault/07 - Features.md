---
tags: [features, capabilities, producto]
fecha: 2026-06-17
---

# ✨ Features completas

> [!abstract] Todo lo que sabe hacer el agente hoy
> Lista exhaustiva de capacidades en producción. Cada feature enlaza a su nota detallada cuando aplica.

---

## 💬 Chat IA con RAG

El core del producto.

- Pregunta-respuesta con conocimiento curado (239 entradas en KB)
- **Streaming SSE** — primer token en ~500ms
- **Memoria conversacional** ("Ficha del cliente" implícita)
- **Quick replies** — chips de respuesta rápida bajo cada mensaje
- **Tool cards neón** — tarjetas clickeables con cotizadores
- **Regenerar** — botón ↺ para volver a generar la última respuesta
- **Feedback 👍/👎** — con razón opcional

Detalle técnico: [[03 - Flujo de pregunta]]

---

## 🤝 Zoho CRM — consulta + gestión autónoma

> [!success] Junio 2026 — el salto grande
> El bot pasó de SOLO chat a operar el CRM. El asesor consulta y **gestiona su cartera en lenguaje natural** (tool-use), sin memorizar comandos. Todo en producción (commit `844d7ce`).

**Consultas (lenguaje natural, sin comandos):**

- **`buscar_cliente`** — por email / teléfono / nombre / Lead# (`L######`) / deal. Encuentra incluso clientes **convertidos** (contacto + deal sin lead).
- **`mis_leads`** — tu cartera con filtros de estado / fecha / orden / cantidad + **triage** "sin nota en 24h".

> [!info] Resolución de asesor sin ambigüedad (`resolveAsesor`)
> Hay **12 usuarios "Juan"** en Zoho. Antes "juan" traía la cartera de otro Juan; ahora desambigua y "mis leads" siempre resuelve a TU propio usuario (email → ID exacto).

> [!info] Stages de Deals reales de Windmar
> En Windmar un **Deal = contrato firmado = venta cerrada** (pagan a la 1ra firma → el lead pasa a "Caso Vendido"). Solo **"Cancelled"** es pérdida. (Antes el código usaba "Closed Won/Lost" inexistentes y "sistema comprado" salía siempre vacío.)

**Autonomía del asesor (escritura con confirmación de 1 clic):**

El asesor pasó de **solo-lectura** a **gestionar** su cartera. Tools scoped a SU cartera (`ownsLead`):

| Tool | Qué hace |
|------|----------|
| `agregar_nota` | Nota en el lead (firma SUN BOT) |
| `actualizar_estado` | Cambia el estado del lead |
| `programar_seguimiento` | Agenda un seguimiento |
| `asignar_leads` | Solo líderes / admins |

> [!warning] Patrón preparar → confirmar
> NO se escribe en Zoho hasta que el asesor da clic en una **tarjeta de confirmación** (`ZohoActionCard`). Esta ejecuta `/api/zoho/action`, que **re-valida el dueño** y **audita todo** (`admin_audit`).

**Tarjetas ricas estructuradas (no markdown parafraseado):**

- **`LeadsCard`** — lista de leads, y **`ClientCardChat`** — ficha de cliente. Se renderizan SIEMPRE desde datos estructurados, móvil-friendly, con enlaces y Lead# reales. (Resolvió el bug donde el bot decía "aquí están tus 29 leads" pero no mostraba ninguno.)
- **Acciones de 1-clic en la ficha:** No contestó · Cita coordinada · Vendido · Nota · Seguimiento.
- **Flujos compuestos:** *"no contestó, lo llamo mañana 10am"* genera en UN turno estado + seguimiento (+nota) en UNA tarjeta combinada con un solo **Confirmar**.

**Tablas HTML interactivas + búsqueda:**

- **Lista de leads en tabla** (filas/columnas): `Lead# · Cliente · Estado · Owner · Consultor · Tel · Creado · Abrir`; bajo **Owner** y **Consultor** se muestra su **correo y teléfono**. Máx **30** filas.
- **Búsqueda por teléfono / correo / nombre** → tabla de los **últimos 3 leads + 3 deals** (estilo NOTAS VASS). Un **Lead# (`L######`)** abre la ficha.
- `L######` resuelve al **record id real** (`getLeadBasic`) → el bot ya no divaga ni inventa.

**🗂️ Tipificación (estilo NOTAS VASS / TELEMERCADEO):**

> [!success] Tipificar y dejar nota en un clic
> La ficha del cliente **y cada fila de la tabla** incluyen un **cuadro de tipificación** (`TipificarForm`), igual en espíritu al de NOTAS VASS / TM.

- **Dropdown de estados** (editables en `/admin/zoho`) + **nota que se autollena** con la plantilla del estado + botón **"Solo llamada"** (registra llamada sin cambiar estado) → **"Guardar"** escribe estado + nota en Zoho en un clic (compound, scoped + auditado).
- **Tipificar INLINE en la tabla**: cada fila se **expande** con el cuadro → tipificar / dejar nota sin re-buscar; la fila queda marcada con ✓.
- **`VentaForm`** (modelo VASS): al elegir **"Caso Vendido"** aparece un formulario de venta completo — selectores de producto (placas / placas+batería / powerwall / water / roofing / anker), sub-productos, cantidad de placas/baterías, financiamiento multi (WH Financial / Oriental / EnFin / Palmetto / Synchrony / Kiwi / Home Depot / Cash), consultor (prefill editable), # de aplicación y observaciones → compone una nota estructurada con preview editable.
- **Plantillas por estado EDITABLES** en `/admin/zoho` (agregar / quitar / reordenar / editar texto), con datalist de los **18 estados oficiales**. Trae plantillas estilo VASS (Caso Vendido: producto + consultor + pago) y TM (No Contesta, Asistencia Coordinada).

> [!info] La nota usa el nombre REAL del SSO
> Título **"Nota — {nombre real del SSO}"** (el apodo del chat NO va en la nota) + atribución **"— Gestión: {nombre real}"** y firma **SUN BOT**.

**📝 NoteHover — última nota al pasar el mouse:**

Ícono 📝 junto al cliente (en la tabla y en la ficha): al pasar el mouse muestra la **última nota** en un mini pop-up estilo Zoho. Carga **bajo demanda** (`/api/zoho/last-note`), cachea y respeta el scoping del asesor.

**Briefing matutino (`BriefingCard`):**

Al abrir el chat muestra **citas de HOY** + **seguimientos vencidos / para hoy** + accionables. Usa campos nativos de Zoho (`Presenter_Appointment`, `Llamar_de_esta_fecha`). Endpoint `/api/zoho/briefing` (rápido, sin consultar notas).

**Config editable en `/admin/zoho`:**

- Mapeos `Lead_Status → grupo` y `Deal Stage → estado` editables **sin redeploy**.
- **Plantillas de tipificación por estado** editables (`zoho_tipificar_opciones`).
- Dashboard de **salud**: consultas **por asesor** (llamadas, prom ms, errores) + gráfica **por día** (RPC `admin_zoho_health` con `byUser`), latencia p50/p95, % error, consultas por herramienta (tabla telemetría `zoho_query_log`).

Detalle del agente Zoho: [[03 - Flujo de pregunta]] · Dashboard: [[11 - Dashboard admin]] · Roadmap proactivo: [[16 - Roadmap]]

---

## 📄 Análisis de cualquier documento (visión IA)

Upload de imagen (JPG/PNG/WebP/GIF) o PDF — máximo 10MB.

**Comportamiento contextual:**

| Con mensaje del asesor | Sin mensaje |
|------------------------|-------------|
| Cumple la instrucción específica<br/>("dame los datos", "¿quién es el titular?") | Detecta tipo de documento automáticamente |

**Tipos detectados automáticamente:**

| Tipo | Qué extrae |
|------|------------|
| 📄 Factura LUMA | Cuenta, dirección, cobro del mes, consumo anual |
| 🪪 ID con foto | Nombre, fecha nacimiento, últimos 4 del número (privacidad) |
| 📋 Cotización/contrato | Cliente, fecha, productos (sin tocar precios) |
| 📑 Otro | Resumen + pregunta qué necesita extraer |

> [!warning] Privacidad
> El archivo **NO se guarda**. Pasa por memoria del request hacia Anthropic y se descarta. Los IDs nunca exponen el número completo.

Endpoint: `/api/upload-document`

---

## 📧 Sistema de correos

6 plantillas formales, firma corporativa automática, adjuntos PDF/JPG/PNG.

Detalle completo: [[08 - Sistema de correos]]

---

## ⚡ Productividad en el input

Atajos físicos en la barra del chat para no romper el flujo de la llamada.

- **🎙️ Dictado por voz** — botón de micrófono con **Web Speech API nativa** del navegador (NO Deepgram). Gratis, on-device, en español; funciona en Edge/Chrome.
- **📧 Botón de correo** — ícono de sobre en la barra (chat activo y pantalla de bienvenida) → abre el modal de plantillas de seguimiento (equivale a `/@`).
- **📞 Dos botones de llamada por lead** — **"3CX"** y **"Kixie"**, ambos con esquema **`tel:`**, centralizados en `lib/dialer.ts`. Se eliminó `callto:` porque **Microsoft Teams lo interceptaba** (Teams tiene llamadas deshabilitadas en el tenant); `tel:` abre el softphone real (3CX hoy; Kixie cuando su extensión esté en Edge).

> [!info] Auto-actualización del PWA
> El PWA cacheaba el JS y los asesores veían versiones viejas. Solución: `next.config` expone `NEXT_PUBLIC_COMMIT_SHA`, **`/api/version`** devuelve el SHA del deploy vivo, y `ServiceWorkerRegister` **recarga sola** al reenfocar si difieren. Ya no hay que limpiar caché. Además, **vista de escritorio más ancha** (chat y tarjetas en `lg`/`xl`).

---

## 🎮 Comandos slash

Atajos rápidos en el input. Detalle: [[09 - Comandos slash]]

---

## 👾 Easter eggs y juegos

Snake, Pong, Invaders con tema Windmar. Detalle: [[10 - Easter eggs]]

---

## 📊 Dashboard administrativo

Métricas, KPIs, auditoría de conversaciones. Detalle: [[11 - Dashboard admin]]

---

## 🔍 Búsqueda en conversaciones

Buscador full-text en el sidebar.

- Debounce 300ms
- Busca en títulos Y contenido de mensajes (user + assistant)
- Resultados con preview de 2 líneas
- Click → navega a la conversación

Endpoint: `/api/conversations/search?q=...`

---

## 🎨 Tema dark/light con View Transitions

Toggle con animación **clip-path circular reveal** (View Transitions API).

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.5s;
}
```

- Persistencia en `localStorage` (`wh-theme`)
- Respeta `prefers-color-scheme` al primer login
- Mascota cambia de versión según tema

---

## 🐛 Coaching socrático

Cuando el asesor duda, el bot devuelve 2-3 preguntas para que las haga AL cliente, implementando SPIN selling.

Ver: [[05 - SYSTEM_PROMPT#6. Modo Socrático]]

---

## 🎯 Memoria de cliente

El bot recuerda datos del cliente mencionados en la conversación:
- Nombre
- Productos discutidos
- Datos de LUMA (si los compartió el asesor)
- Tipo de techo, edad, sqft

Esto le permite responder coherentemente sin pedir los mismos datos otra vez.

---

## 🔐 SSO Microsoft Entra

- Solo `@windmarhome.com`
- Auto-provisión de perfil en primer login
- Foto descargada de Microsoft Graph (`/me/photo`)
- Sesión 8 horas (auto-logout fin de turno)
- Refresh token para mantener `Mail.Send` vivo > 1h

Detalle: [[03 - Flujo de pregunta]]

---

## 👤 Onboarding

Modal de bienvenida en el primer login pregunta:
- Display name (puede ser apodo)
- Departamento
- Rol (Asesor / Líder / Channel / Project M)

Estos datos personalizan el tono y se guardan en `user_roles`.

---

## 🎭 Mascota viva — SUN BOT

Estados de la mascota animada:
- `idle` — normal con halo respirando
- `typing` — animación escribiendo cuando el asesor tipea
- `thinking` — cuando se procesa la respuesta
- `loading` — durante upload de archivos
- `happy` — en juegos como Snake
- `error` — cuando algo falla

Imágenes en `public/sunbot-*.png` (pixel art).

---

## 🗂️ Múltiples conversaciones

Sidebar con:
- Lista de conversaciones (más recientes arriba)
- **Nueva conversación** (botón naranja)
- **Borrar individual** (icono trash al hover)
- **Borrar todo el historial** (con confirmación double-click)
- **Buscador** (full-text)
- **Tip del día** rotativo cada 25s

---

## ✅ Auditoría completa

Todo queda registrado:
- Mensajes (user + assistant)
- Feedback (👍/👎 con razón)
- Conversaciones (incluso las borradas — soft delete con `deleted_at`)
- Correos enviados (vía Microsoft Graph)
- Login events (vía NextAuth)

Visible en el [[11 - Dashboard admin]].

---

## Conexiones

- 🧠 Cómo se controla el comportamiento: [[05 - SYSTEM_PROMPT]]
- 🛣️ Features que vienen: [[16 - Roadmap]]

[[00 🌞 MOC|← Volver al MOC]]
