---
tags: [arquitectura, stack, técnico]
fecha: 2026-05-26
---

# 🏗️ Arquitectura

## Stack tecnológico

| Capa | Tecnología | Versión | Por qué |
|------|-----------|---------|---------|
| Framework | Next.js (App Router) | `15.5` | RSC + streaming + edge functions |
| UI | React + TypeScript | `19.2` / `5.8` | Tipado fuerte, ecosistema |
| Estilos | Tailwind CSS | `4.1` | Velocidad sin abandonar control |
| Auth | NextAuth (Auth.js) | `5.0.0-beta` | Microsoft Entra plug-and-play |
| Base | Supabase (PostgreSQL) | `2.49` | RPC nativo, RLS, instant API |
| Modelo | Claude Haiku 4.5 | SDK `0.95` | El más rápido del mercado |
| Charts | Recharts | `3.8` | React-friendly, customizable |
| Deploy | Vercel | — | Cero-config para Next.js |
| Correo | Microsoft Graph API | — | El asesor envía desde su Outlook |

> [!info] Por qué cada elección
> Justificaciones completas: [[15 - Decisiones técnicas]]

---

## Diagrama general

```mermaid
graph TB
    Asesor([👤 Asesor Windmar])
    Login{🔐 Login SSO Microsoft}
    Asesor -->|abre chat| Login
    Login -->|@windmarhome.com| Chat[💬 ChatApp]
    Login -.->|otro dominio| Reject[❌ Acceso denegado]

    Chat -->|POST /api/chat| Backend{🧠 Backend Next.js}
    Backend --> RAG[(📚 Supabase<br/>knowledge_base)]
    Backend --> Tools[(🛠️ Supabase<br/>tools)]
    Backend --> Claude[🤖 Claude Haiku 4.5<br/>streaming]

    Claude -->|tokens stream| Chat
    Chat -->|guarda| MsgDB[(💾 messages)]
    Chat -->|👍/👎| FeedDB[(📊 feedback)]

    Chat -->|📎 archivo| Upload[/api/upload-document/]
    Upload -->|visión| Claude

    Chat -->|/@| EmailModal[📧 Modal correo]
    EmailModal -->|Graph API| Outlook[(📨 Outlook del asesor)]

    Admin([👔 Admin]) -->|/admin| Dashboard[📊 Dashboard]
    Dashboard --> Metrics[(📈 RPC admin_*)]

    classDef hub fill:#F7941D,color:#fff,stroke:#1B3A5C,stroke-width:2px
    classDef db fill:#3ECF8E,color:#fff,stroke:#1B3A5C
    classDef ai fill:#D97757,color:#fff,stroke:#1B3A5C
    class Chat,EmailModal hub
    class RAG,Tools,MsgDB,FeedDB,Metrics db
    class Claude,Upload ai
```

---

## Capas del sistema

### 1. Cliente (browser)
- React Server Components donde es posible
- Cliente components (`'use client'`) solo cuando hay estado/interacción
- Streaming SSE para respuestas en tiempo real
- localStorage para preferencias (tema, extensión telefónica, snake high score)

### 2. Server (Next.js API routes)
- `/api/chat` → orquesta RAG + Claude + streaming
- `/api/upload-document` → análisis con visión IA
- `/api/email/send` → Microsoft Graph
- `/api/conversations` `/api/messages` `/api/feedback` → CRUD
- `/api/admin/metrics` → métricas dashboard

### 3. Datos (Supabase)
Ver: [[04 - Esquema Supabase]]

### 4. Modelo (Anthropic)
- Claude Haiku 4.5 — el más rápido + el más barato
- **Prompt caching** ephemeral (TTL 5 min) en el SYSTEM_PROMPT
- Streaming SSE para mostrar tokens incrementalmente
- Vision API para análisis de documentos

### 5. SSO (Microsoft Entra)
Ver: [[03 - Flujo de pregunta#Autenticación]]

---

## Decisiones de diseño clave

> [!tip] Edge vs Node runtime
> El endpoint `/api/chat` corre en **Node runtime** (no Edge) porque necesita streaming bidireccional con la API de Anthropic. Edge sería más rápido pero tiene limitaciones de duración.

> [!tip] Prompt caching
> El SYSTEM_PROMPT es ~6000 tokens. Sin caching costaría caro y sería lento. Con cache ephemeral, después del primer mensaje el costo baja ~90%.

> [!tip] RAG dinámico vs fine-tuning
> Decidimos RAG (búsqueda + inyección) sobre fine-tuning porque:
> - El KB cambia (productos, precios, políticas)
> - Cero retraining cost
> - Trazabilidad: sabemos qué entrada del KB usó el bot

---

## Conexiones

- 🔁 Cómo fluye una pregunta paso a paso: [[03 - Flujo de pregunta]]
- 🗄️ Detalle de la base de datos: [[04 - Esquema Supabase]]
- 📁 Cómo está organizado el código: [[12 - Estructura del repo]]
- 🚀 Cómo se despliega: [[14 - Deploy]]

[[00 🌞 MOC|← Volver al MOC]]
