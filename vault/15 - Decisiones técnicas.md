---
tags: [decisiones, arquitectura, técnico, justificación]
fecha: 2026-05-26
---

# 🧰 Decisiones técnicas

> [!info] Por qué cada pieza
> Documenta las decisiones importantes para que el equipo (y agentes IA del futuro) entiendan el porqué — no solo el qué.

---

## ¿Por qué Claude Haiku 4.5?

> [!tip] La decisión
> Claude Haiku 4.5 de Anthropic sobre GPT-4o-mini, Gemini Flash o Llama.

**Razones:**

1. **Velocidad** — Haiku es el modelo más rápido del mercado. TTFT bajo 500ms.
2. **Calidad** — instrucción-following de Haiku 4.5 es notablemente mejor que generaciones anteriores. Respeta la REGLA SUPREMA confiablemente.
3. **Prompt caching ephemeral** — TTL 5 min reduce costos ~90% en mensajes consecutivos.
4. **Vision API** — análisis de documentos (facturas LUMA, IDs) sin servicio aparte.
5. **Streaming SSE robusto** — sin timeouts random.

**Trade-offs aceptados:**
- Más caro que Llama self-hosted, pero infinitamente más simple de operar.
- Más caro que Gemini Flash, pero la calidad de razonamiento de Anthropic vale la diferencia para coaching socrático.

---

## ¿Por qué Supabase?

> [!tip] La decisión
> Supabase (PostgreSQL gestionado) sobre PlanetScale, MongoDB Atlas, o Firebase.

**Razones:**

1. **PostgreSQL real** — RPC nativo (`search_knowledge`, funciones admin), JSON columns, full-text search built-in.
2. **Auto-API REST + cliente JS** — pero no lo usamos del lado del cliente (security).
3. **Migrations versionables** en SQL plano (carpeta `supabase/migrations/`).
4. **RLS opcional** — si algún día abrimos el cliente al navegador, podemos activar row-level security.
5. **Generoso free tier** — para una app interna de Call Center, gratis.

**Trade-offs:**
- Latencia desde Vercel a Supabase (~80ms). Aceptable.
- No tiene vector search out-of-the-box. Si el KB crece, agregar `pgvector`.

---

## ¿Por qué Next.js 15 App Router?

> [!tip] La decisión
> Next.js App Router sobre Pages Router, Remix, SvelteKit, o SPA pura.

**Razones:**

1. **React Server Components** — `page.tsx` puede ser server-side (lee Supabase directamente sin endpoint).
2. **Streaming SSR** — el chat necesita streaming bidireccional con la API.
3. **API routes built-in** — endpoints como funciones, sin server separado.
4. **Vercel deploy 1-click** — son del mismo equipo, optimización máxima.
5. **TypeScript first-class** — todos los tipos funcionan out-of-box.

**Trade-offs:**
- App Router es más nuevo y a veces ambiguo. Hubo confusiones con `cookies()` async en v15.
- Lock-in con Vercel para máximo provecho. Cambiar a Cloudflare Workers requeriría reescribir streaming.

---

## ¿Por qué Microsoft Graph para correos (y no SendGrid/Resend)?

> [!tip] La decisión
> Microsoft Graph `sendMail` sobre SendGrid, Resend, Mailgun o cuenta SMTP genérica.

**Razones:**

1. **El correo sale del Outlook del asesor** — no de una cuenta noreply@. Esto es CRÍTICO para call center: el cliente responde y el asesor lo recibe en su inbox normal.
2. **Queda en /Sent Items** — auditoría natural sin escribir código.
3. **Aprovecha el SSO ya implementado** — solo agregamos el scope `Mail.Send`.
4. **Costo zero** — no es un servicio adicional. Está incluido en la licencia M365.
5. **Compliance** — la empresa controla todo el flujo desde sus propios tenants.

**Trade-offs:**
- Asesor debe aprobar el consent una vez (popup MS).
- Si el asesor cambia de empresa, hay que re-aprobar.
- Refresh token logic agrega complejidad (vs SendGrid que es stateless).

---

## ¿Por qué RAG y no fine-tuning?

> [!tip] La decisión
> Retrieval-Augmented Generation con búsqueda en Supabase, no fine-tuning de Claude.

**Razones:**

1. **KB cambia frecuentemente** — productos, precios, políticas, promociones. Fine-tuning requeriría re-entrenamiento constante.
2. **Trazabilidad** — sabemos QUÉ entrada del KB usó el bot (las top 8 inyectadas).
3. **Costo cero de entrenamiento** — RAG es solo búsqueda + prompt.
4. **Edición instantánea** — actualizar una fila en `knowledge_base` afecta la próxima respuesta.
5. **Multi-área** — cuando Florida replique (ver [[16 - Roadmap]]), llenan su propio KB sin tocar el modelo.

---

## ¿Por qué prompt caching ephemeral?

> [!tip] La decisión
> Cache ephemeral (TTL 5 min) sobre cache persistent o sin cache.

**Razones:**

1. **El SYSTEM_PROMPT es ~6000 tokens** — sin cache se pagaría completo cada turno.
2. **Asesores hacen ráfagas** — entre llamada y llamada, varios mensajes seguidos. Cache cubre el caso típico.
3. **No queremos confusión entre asesores** — ephemeral garantiza aislamiento.
4. **Ahorro real medido:** ~90% en costos de tokens del system prompt.

---

## ¿Por qué pantalla de inicio con partículas?

> [!tip] La decisión
> Welcome screen con animación de partículas + logo grande, en lugar de chat vacío.

**Razones:**

1. **Refuerza el branding** — los asesores reconocen al SUN BOT.
2. **Calienta el momento de uso** — el asesor está saliendo de una llamada estresante, ver algo cálido ayuda.
3. **Confirma que el bot está vivo** — sin partículas se vería estático.
4. **Pregunta proactiva** — "¿En qué vamos a trabajar hoy?" invita a usar.

**Trade-off:** un ms más de carga inicial (despreciable).

---

## ¿Por qué CSS Grid para los juegos?

> [!tip] La decisión
> CSS Grid + divs sobre canvas / WebGL.

Detalles en [[10 - Easter eggs#Decisión: ¿por qué CSS Grid y no canvas?]]

---

## ¿Por qué soft delete?

> [!tip] La decisión
> Marcar `deleted_at` en `conversations` sobre DELETE real.

**Razones:**

1. **Auditoría** — supervisores pueden ver conversaciones "borradas" en el dashboard.
2. **Recuperación** — si un asesor borra por error, se restaura cambiando `deleted_at` a NULL.
3. **Compliance** — algunas jurisdicciones requieren retención de comunicaciones de servicio al cliente.

---

## Decisiones reversadas

> [!warning] Cosas que probamos y descartamos
> - **Groq con Llama-3.3-70b**: era el primer plan. Migrado a Claude Haiku porque la calidad de instrucción-following era notablemente superior.
> - **Vector search con pgvector**: planeado, pero el ILIKE actual funciona bien para 239 entradas. Implementaremos cuando crezca el KB.
> - **Voice-to-text** mientras el asesor escucha la llamada: descartado por sensibilidad/privacidad y por dificultad técnica.
> - **TopKeywords y WeekComparison del dashboard**: removidos por preferencia del admin. Código preservado en repo.
> - **Quick replies como preguntas para el cliente**: rompía el flujo (loop infinito). Cambiado a "lo que el asesor diría AL bot".

---

## Conexiones

- 🏗️ Cómo viven estas decisiones en código: [[02 - Arquitectura]]
- 🛣️ Decisiones futuras pendientes: [[16 - Roadmap]]

[[00 🌞 MOC|← Volver al MOC]]
