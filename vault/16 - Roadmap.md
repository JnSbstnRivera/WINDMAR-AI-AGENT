---
tags: [roadmap, futuro, ideas, planning]
fecha: 2026-05-26
estado: planificación
---

# 🛣️ Roadmap futuro

> [!info] Vivo y cambiante
> Esta lista refleja las ideas en cola al 2026-05-26. Se actualiza conforme los asesores van pidiendo cosas y vemos qué funciona en producción.

---

## ✅ Entregado (jun 11–15 2026) — Zoho + autonomía

> [!success] La gran actualización ya está EN PRODUCCIÓN (commit `33b7c8f`)
> El bot dejó de ser solo chat y ahora **opera el CRM**. Lo que antes era roadmap aquí ya está hecho.

- [x] **Integración Zoho CRM (lectura)** — `buscar_cliente` + `mis_leads` en lenguaje natural (sin comandos), con triage "sin nota en 24h".
- [x] **Resolución de asesor sin ambigüedad** (`resolveAsesor`) — arreglado el bug de los 12 "Juan"; "mis leads" resuelve por email → ID exacto.
- [x] **Stages de Deals reales** — Deal = contrato firmado = venta cerrada; solo "Cancelled" es pérdida.
- [x] **Autonomía del asesor (escritura con confirmación de 1 clic)** — `agregar_nota`, `actualizar_estado`, `programar_seguimiento`, scoped a su cartera (`ownsLead`), patrón preparar → confirmar (`ZohoActionCard` → `/api/zoho/action`, re-valida dueño + audita en `admin_audit`).
- [x] **Tarjetas ricas estructuradas** — `LeadsCard`, `ClientCardChat`, acciones de 1-clic y flujos compuestos en una sola tarjeta combinada.
- [x] **Briefing matutino** (`BriefingCard`) — citas de hoy + seguimientos vencidos vía `/api/zoho/briefing`.
- [x] **Config editable en `/admin/zoho`** — mapeos sin redeploy + dashboard de salud (tabla `zoho_query_log`).
- [x] **Dictado por voz** — Web Speech API **nativa** del navegador (on-device, gratis), reemplaza al "Modo dictado mejorado" que estaba pausado. Deepgram **descartado** para esta app.
- [x] **Productividad en el input** — botón de correo en la barra + dos botones de llamada por lead (3CX `callto:` / Kixie `tel:`, `lib/dialer.ts`).

Infra nueva: libs `zoho-actions.ts`, `zoho-leads-card.ts`, `zoho-client-card.ts`, `zoho-config.ts`, `zoho-status.ts`, `quick-replies.ts`, `dialer.ts`; endpoints `/api/zoho/action`, `/api/zoho/briefing`, `/api/admin/zoho/config`, `/api/admin/zoho/health`; migraciones **015** (`zoho_status_map`, `zoho_deal_stage_map`, `zoho_query_log`) y **016** (RPC `admin_zoho_health`).

Detalle de features: [[07 - Features#🤝 Zoho CRM — consulta + gestión autónoma]]

---

## 🔴 Prioridad alta

### 🤖 Fase E — Automatización proactiva
**Estado:** Pendiente (requiere credenciales del usuario).

Sacar las alertas del chat hacia canales pasivos:
- **n8n** — sync nocturno Zoho → Supabase + alertas automáticas.
- **botmaker** — briefing / recordatorios por WhatsApp.
- Flujo: **Zoho → n8n → botmaker**.

### 🔧 Fase F — Afinamiento
**Estado:** Pendiente.

- **Latencia** — traer notas en bloque vía **COQL** (de ~30 llamadas a 1-2).
- **"Líder ve solo su equipo"** — hoy el líder ve todo.
- **Limpieza** — ocultar los juegos bajo `/sobre` (ver [[09 - Comandos slash]] y [[10 - Easter eggs]]) + fix del `<select>` de Usuarios.

### 📲 B.2 — Push PWA matutino
**Estado:** Pendiente.

Briefing matutino como notificación push de la PWA. Requiere **llaves VAPID** + suscripción por usuario + cron.

### 🌍 Replicar para Florida
**Estado:** Documentación lista (`GUIA-MAESTRA-REPLICACION-WINMARD-AGENT-AI.md` en raíz del repo). Pendiente que el colega de Florida arranque.

Cada área tendrá su **propio chat** con:
- Su propio knowledge base
- Sus propias herramientas (si Florida tiene cotizadores distintos)
- Su dominio SSO (`@windmarfl.com` o similar)
- Su tono y reglas de negocio

> Ver: el archivo `GUIA-MAESTRA-REPLICACION-WINMARD-AGENT-AI.md` (auto-contenido para que el Claude del colega lo lea siguiendo AI-DLC).

### 📨 Tracking de respuestas a correos
**Estado:** Planeado.

Microsoft Graph permite escuchar el inbox del asesor vía webhooks. Cuando el cliente responde al correo de seguimiento, marcar la conversación con un badge "📩 Respondió".

### 🔔 Notificaciones push
**Estado:** Diseño pendiente.

Cuando el cliente responda un correo o cuando un asesor reciba un mensaje (futuro: chat asíncrono), enviar push al navegador. Service Worker + Web Push API.

---

## 🟡 Prioridad media

### 🎯 Predicción de cierre
**Estado:** Ideación.

Modelo ML simple que analice patrones en conversaciones cerradas exitosas vs no, y prediga la probabilidad de cierre por cada conversación activa. Inputs:
- Largo de la conversación
- Mensajes de objeción detectados
- Tools recomendadas
- Tiempo en cada etapa

### 🤖 Auto-tagging de conversaciones
**Estado:** Spec borrador.

Después de cada conversación, llamar a Claude con el historial y pedirle tags:
- `cierre-en-primera-llamada`
- `objeción-precio-resuelta`
- `cliente-pidió-tiempo`
- `requiere-visita-técnica`

Útil para filtros en el dashboard y para entrenar el modelo si algún día hacemos fine-tuning.

### 📱 PWA instalable
**Estado:** Add manifest.json + service worker básico.

Para que el asesor pueda "instalar" el agente en su celular como app nativa. Útil si trabajan en campo.

### 🎙️ ~~Modo dictado mejorado~~ → ✅ ENTREGADO
**Estado:** Hecho (jun 2026). Ver sección [[#✅ Entregado (jun 11–15 2026) — Zoho + autonomía|Entregado]].

Se resolvió con **Web Speech API nativa on-device** (gratis, en español, sin enviar audio a terceros), que justamente atiende la preocupación de privacidad que lo tenía pausado. Deepgram quedó **descartado** para esta app.

---

## 🟢 Prioridad baja / nice-to-have

### 🎨 Más temas visuales
Actualmente: light, dark. Considerados:
- Vintage (sepia, papel, tipografía serif)
- Hacker (verde fosforescente en negro)
- Festivos (navidad, año nuevo, día de Puerto Rico)

### 🎮 Más juegos
- Tetris solar (piezas de placas)
- Memory game (pares de productos Windmar)
- Quiz de conocimiento del bot (gamificación del KB)

### 📊 Reportes automáticos por correo
Vercel Cron + plantilla → envío semanal a admins con métricas resumidas.

### 🔍 Vector search con pgvector
Cuando el KB supere 500 entradas, migrar de ILIKE a embeddings reales.

### 🌐 Multi-idioma
El bot detecta inglés y responde en inglés. Útil si Windmar Florida o expansión a clientes hispanos en US continental.

---

## 🧊 En el congelador (no ahora)

### ❌ Chat asíncrono entre asesores
Slack-like dentro de la app. Decidimos NO porque Teams ya lo hace.

### ❌ App nativa iOS/Android
Costo/beneficio no cierra. PWA es suficiente.

### ❌ Versión pública para clientes finales
Riesgo de info filtrada + REGLA SUPREMA. Por ahora solo interna.

### ❌ Descartados por el usuario (jun 2026)
- **Deepgram** (para esta app) — reemplazado por Web Speech API nativa.
- **Power BI**
- **Supermetrics**

---

## Cómo proponer una idea

> [!tip] Proceso
> 1. Pregúntate: ¿es algo que el asesor pidió o algo que YO creo que necesita?
> 2. Si es del asesor → captura el caso de uso real
> 3. Si es tuyo → busca confirmación de 3+ asesores antes de buildear
> 4. Documenta el "qué" y el "por qué" en esta nota
> 5. Asigna prioridad

> [!quote] Anti-pattern a evitar
> *"Sería cool tener X"* — sin caso de uso real, no se construye.

---

## Decisiones que cambiaron el roadmap

> [!info] Histórico
> - **Mar 2026** — Migración de Groq/Llama a Claude Haiku 4.5 (calidad)
> - **Abr 2026** — REGLA SUPREMA codificada en el SYSTEM_PROMPT después de un incidente
> - **May 2026** — Sistema de correos vía Microsoft Graph (no SendGrid)
> - **May 2026** — Vault Obsidian creado para documentación viva
> - **May 2026** — Guía de replicación AI-DLC para Florida
> - **Jun 2026** — Integración Zoho CRM + **autonomía del asesor** (escritura con confirmación de 1 clic); el bot pasó de chat a operar el CRM (commit `33b7c8f`)
> - **Jun 2026** — Dictado por voz con **Web Speech API nativa** (Deepgram descartado por privacidad/costo)

---

## Conexiones

- 🎯 Cuál es la visión que guía el roadmap: [[01 - Visión y propósito]]
- 🧰 Decisiones técnicas previas: [[15 - Decisiones técnicas]]

[[00 🌞 MOC|← Volver al MOC]]
