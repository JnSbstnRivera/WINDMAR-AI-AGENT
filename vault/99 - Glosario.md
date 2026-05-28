---
tags: [glosario, referencia, términos]
fecha: 2026-05-26
---

# 📚 Glosario

> [!info] Cómo usar esta nota
> Términos clave del proyecto en orden alfabético. Si encuentras una palabra extraña en otra nota, búscala aquí. Cada entrada enlaza a su nota detallada cuando aplica.

---

## A

**Asesor**
Persona del call center que atiende clientes. Usuario principal del agente. Tiene rol `Asesor` en `user_roles`.

**App Registration**
Registro de la app en Microsoft Entra Azure. Define qué scopes pide, qué redirect URIs acepta, y devuelve los client_id/secret. Lo configura IT una sola vez.

**Anthropic**
Empresa creadora de Claude. Provee el modelo de lenguaje del bot. API: `console.anthropic.com`.

---

## C

**Claude Haiku 4.5**
Modelo de lenguaje que usa el bot. El más rápido y barato de la familia Claude. Ver: [[15 - Decisiones técnicas#¿Por qué Claude Haiku 4.5?]]

**Cotizador**
Herramienta externa (web) que calcula precios oficiales con todos los inputs. El bot redirige a estos en lugar de dar precios él mismo. Ver: [[06 - REGLA SUPREMA]]

**Cuenta LUMA**
Número de cuenta del cliente con LUMA Energy (proveedor eléctrico de PR). Aparece en la factura.

---

## D

**Display name**
Nombre con el que el asesor quiere que el bot le hable. Puede ser apodo. Lo configura en onboarding. Distinto del [[#Nombre formal]] usado en correos.

**Downvote (👎)**
Voto negativo del asesor a una respuesta del bot. Se registra en `message_feedback` con razón opcional. El [[11 - Dashboard admin]] lo muestra para mejorar el SYSTEM_PROMPT.

---

## E

**Edge runtime**
Tipo de runtime de Vercel/Next.js que corre en edge functions globales. Más rápido pero limitado. **NO usado en este proyecto** porque el streaming bidireccional con Anthropic no funciona bien en edge. Usamos `runtime: 'nodejs'`.

**Email send**
Endpoint `/api/email/send`. Envía correos vía Microsoft Graph desde el Outlook del asesor. Ver: [[08 - Sistema de correos]]

**Entra ID**
Antiguo "Azure AD". Sistema de identidad de Microsoft. Donde vive el SSO del tenant Windmar.

**Ephemeral cache**
Modo de prompt caching de Anthropic con TTL 5 min. Reduce costos ~90% en el SYSTEM_PROMPT.

---

## F

**Feedback**
Reacciones 👍/👎 a las respuestas del bot. Tabla: `message_feedback`. Ver: [[11 - Dashboard admin#👎 Downvotes recientes]]

---

## G

**Graph API**
API de Microsoft para acceder a recursos del usuario (correo, calendario, drive, foto de perfil). Usado para:
- Descargar foto del asesor (`/me/photo/$value`)
- Enviar correos (`/me/sendMail`)

---

## H

**Haiku**
Forma corta de "Claude Haiku 4.5". Ver [[#Claude Haiku 4.5]].

---

## K

**Knowledge base (KB)**
Tabla `knowledge_base` en Supabase. Contiene 239 entradas curadas con el conocimiento de Windmar. El bot busca aquí (RAG) antes de responder. Ver: [[04 - Esquema Supabase#📚 knowledge_base]]

---

## L

**LUMA Energy**
Proveedor eléctrico de Puerto Rico. Las facturas de LUMA son fuente clave de info para calcular tamaño de sistemas solares.

**LUMA Scanner**
Herramienta hermana del agente. Convierte foto de factura LUMA en cotización solar. Comparte API key de Anthropic con el agente. Repo: `LUMA-SCANNER`. Ver nota: [[LUMA-SCANNER]] (en vault padre).

---

## M

**Mail.Send**
Permission/scope de Microsoft Graph que permite enviar correos como el usuario. Es **user-consentable** (no requiere admin consent). Ver: [[08 - Sistema de correos#Setup requerido]]

**Microsoft Graph**
Ver [[#Graph API]].

**MOC (Map of Content)**
Nota índice de un vault Obsidian. La nuestra: [[00 🌞 MOC]].

---

## N

**NextAuth**
Librería de autenticación para Next.js (también llamada Auth.js v5). Maneja el SSO con Microsoft Entra. Persiste el JWT en cookie httpOnly. Ver: `src/auth.ts`.

**Nombre formal**
Nombre completo extraído del SSO ("Juan Rivera"). Usado en firmas de correo. Distinto del [[#Display name]] (apodo). Ver: [[08 - Sistema de correos#Firma corporativa]]

---

## P

**Prompt caching**
Feature de Anthropic que cachea partes del prompt para no recobrarlas en cada request. Ver: [[15 - Decisiones técnicas#¿Por qué prompt caching ephemeral?]]

**PR**
Puerto Rico. Versión actual del agente. El plan es replicar a otras regiones (Florida). Ver: [[16 - Roadmap]]

---

## Q

**Quick Replies**
Chips de respuesta rápida bajo cada mensaje del bot. Lo que el ASESOR diría AL bot (afirmaciones con datos), no preguntas para el cliente. Bug histórico que generó loops. Ver: [[05 - SYSTEM_PROMPT#8. Quick Replies]]

---

## R

**RAG (Retrieval-Augmented Generation)**
Patrón donde se buscan documentos relevantes ANTES de llamar al LLM y se inyectan en el prompt como contexto. Lo usamos sobre `knowledge_base`. Alternativa al fine-tuning. Ver: [[03 - Flujo de pregunta#Paso 4 — RAG]]

**Refresh token**
Token de larga duración (90 días) que permite obtener nuevos access_tokens cuando expiran (cada 1h). Necesario para mantener `Mail.Send` operativo durante todo el turno.

**REGLA SUPREMA**
Cero precios concretos. Ver: [[06 - REGLA SUPREMA]]

**RLS (Row-Level Security)**
Feature de PostgreSQL para restringir filas por usuario. **No usado** en este proyecto porque todo va por API routes server-side con service role key.

**Rol**
Cargo del asesor: `Asesor` / `Líder` / `Channel` / `Project M`. Determina el tono del bot. Ver: [[05 - SYSTEM_PROMPT#3. Tonos por rol]]

**RPC (Remote Procedure Call)**
En Supabase, función PostgreSQL llamable vía API. Las usamos para queries complejas (RAG, métricas). Ver: [[04 - Esquema Supabase#Funciones RPC]]

---

## S

**Sidebar**
Panel izquierdo del chat con lista de conversaciones, búsqueda, perfil del asesor, y Tip del día.

**Slug**
Identificador único en URL-friendly. Las herramientas tienen slugs (`cotizador-loan`, `luma-scanner`, etc.).

**Soft delete**
Marcar registro como borrado sin eliminarlo físicamente. Usamos `deleted_at` en `conversations` para esto. Ver: [[15 - Decisiones técnicas#¿Por qué soft delete?]]

**SSE (Server-Sent Events)**
Protocolo HTTP unidireccional servidor→cliente. Usado para streaming de tokens de Claude.

**SSO (Single Sign-On)**
Login con cuenta corporativa Microsoft. Solo `@windmarhome.com`.

**Sun Bot**
Nombre cariñoso del agente. El logo es un sol pixel-art con cara feliz.

**SYSTEM_PROMPT**
El "cerebro" del bot. Define comportamiento, tono, reglas. Ver: [[05 - SYSTEM_PROMPT]]

---

## T

**Tenant**
Instancia de Microsoft Entra de una organización. Windmar tiene su propio tenant. El agente está registrado en ese tenant.

**Tool refs**
Array de slugs de herramientas en `messages.tool_refs[]`. Permite saber qué herramientas el bot mencionó en cada mensaje. Útil para analytics.

**TTL (Time To Live)**
Tiempo de vida. El cache de Anthropic es ephemeral con TTL 5 min — después de 5 min sin uso, se recobra el prompt completo.

---

## U

**Upload-document**
Endpoint `/api/upload-document`. Análisis con visión IA de cualquier documento. Genérico (no solo facturas LUMA). Ver: [[07 - Features#📄 Análisis de cualquier documento]]

**User roles**
Tabla `user_roles` en Supabase. Perfil del asesor: display_name, departamento, rol, photo_url. Auto-provisionada en primer login.

---

## V

**Vector search**
Búsqueda semántica usando embeddings. **No implementado aún** — usamos ILIKE. Migración futura cuando el KB crezca. Ver: [[16 - Roadmap]]

**Vercel**
Plataforma de hosting/deploy donde corre el agente. Same-team que Next.js. Ver: [[14 - Deploy]]

**Visión IA**
Capacidad de Claude de analizar imágenes y PDFs. Usado en `/api/upload-document` para extraer datos de documentos del cliente.

---

## W

**Wikilinks**
Sintaxis `[[Nota]]` o `[[Nota|alias]]` que crea enlaces en Obsidian. Aparecen en el Graph View como conexiones entre notas.

**Windmar Home**
Empresa madre. Llevamos 22 años iluminando hogares en Puerto Rico (solar, roofing, agua, baterías, EV).

---

## Conexiones

- 🌞 Mapa completo: [[00 🌞 MOC]]
- 🎯 Visión del proyecto: [[01 - Visión y propósito]]

[[00 🌞 MOC|← Volver al MOC]]
