# 🗺️ Roadmap Visual — WINDMAR AI AGENT

> Mapa conceptual del proyecto. **Última actualización: 7 mayo 2026**
> Estado: **Migración a Next.js + SSO Microsoft (sin DNS/email)** 🔄

---

## 🌟 Vista General

```mermaid
flowchart TD
    Root[🌟 WINDMAR AI AGENT]
    Root --> Done[✅ COMPLETADO]
    Root --> Now[🔄 EN CURSO]
    Root --> Next[⏳ PRÓXIMO]

    Done --> D1[Infraestructura]
    Done --> D2[Conocimiento]
    Done --> D3[Inteligencia]
    Done --> D4[UX/UI]
    Done --> D5[Auth + Perfil v1]
    Done --> D7[Migración Next.js<br/>+ SSO Microsoft]

    Now --> N1[SSO Microsoft Entra ID<br/>esperando IT]
    Now --> N2[Validación con asesores]

    Next --> X1[Claude API]
    Next --> X2[Dashboard admin]
    Next --> X3[Sistema feedback]
    Next --> X4[Zoho CRM]

    style Root fill:#1B3A5C,color:#fff
    style Done fill:#22c55e,color:#fff
    style Now fill:#fbbf24,color:#000
    style Next fill:#a78bfa,color:#fff
    style D1 fill:#dcfce7,color:#15803d
    style D2 fill:#dcfce7,color:#15803d
    style D3 fill:#dcfce7,color:#15803d
    style D4 fill:#dcfce7,color:#15803d
    style D5 fill:#dcfce7,color:#15803d
    style D7 fill:#dcfce7,color:#15803d
    style N1 fill:#fef3c7,color:#92400e
    style N2 fill:#fef3c7,color:#92400e
    style X1 fill:#ede9fe,color:#5b21b6
    style X2 fill:#ede9fe,color:#5b21b6
    style X3 fill:#ede9fe,color:#5b21b6
    style X4 fill:#ede9fe,color:#5b21b6
```

---

## 🚦 Estado por Bloques

```mermaid
flowchart TD
    Start([🚀 Inicio Proyecto]) --> A
    A[🟢 BLOQUE A<br/>Infraestructura<br/>✅]
    A --> B[🟢 BLOQUE B<br/>Conocimiento<br/>✅]
    B --> C[🟢 BLOQUE C<br/>Prompt IA<br/>✅]
    C --> D[🟢 BLOQUE D<br/>UX/UI<br/>✅]
    D --> H[🟢 BLOQUE H<br/>Auth + Perfil v1<br/>✅]
    H --> I{🟡 BLOQUE I<br/>Migración Next.js<br/>+ SSO Microsoft<br/>📍 AQUÍ}
    I -->|IT entrega creds| E[⏳ BLOQUE E<br/>Validación con<br/>asesores]
    E -->|Feedback OK| F[⏳ BLOQUE F<br/>Optimización]
    F --> V1([🎯 v1.0 PRODUCCIÓN])
    V1 --> G[🔮 BLOQUE G<br/>Integraciones<br/>Backlog]

    style A fill:#22c55e,color:#fff
    style B fill:#22c55e,color:#fff
    style C fill:#22c55e,color:#fff
    style D fill:#22c55e,color:#fff
    style H fill:#22c55e,color:#fff
    style I fill:#fbbf24,color:#000
    style E fill:#94a3b8,color:#fff
    style F fill:#94a3b8,color:#fff
    style G fill:#a78bfa,color:#fff
    style V1 fill:#f97316,color:#fff
    style Start fill:#1B3A5C,color:#fff
```

---

## 📊 Detalle por Bloque

### 🟢 BLOQUE A — Infraestructura ✅

```mermaid
flowchart LR
    A1[Auth Supabase] --> A2[Sesión persistente]
    A2 --> A3[Backend Vercel]
    A3 --> A4[Streaming responses]
    A4 --> A5[RLS por asesor]
    A5 --> A6[Deploy automático]

    style A1 fill:#22c55e,color:#fff
    style A2 fill:#22c55e,color:#fff
    style A3 fill:#22c55e,color:#fff
    style A4 fill:#22c55e,color:#fff
    style A5 fill:#22c55e,color:#fff
    style A6 fill:#22c55e,color:#fff
```

### 🟢 BLOQUE B — Conocimiento ✅

```mermaid
flowchart TD
    KB[(📚 Knowledge Base<br/>206 entradas)]
    KB --> B1[☀️ Solar]
    KB --> B2[🔋 Anker]
    KB --> B3[💧 Water]
    KB --> B4[🏠 Roofing]
    KB --> B5[💰 Financiamiento]
    KB --> B6[🛡️ Garantías]
    KB --> B7[⚙️ Procesos]
    KB --> B8[💬 Objeciones]
    KB --> B9[🔧 10 Herramientas]

    style KB fill:#F7941D,color:#fff
```

### 🟢 BLOQUE C — Prompt Adaptativo ✅

```mermaid
flowchart TD
    User[👤 Usuario pregunta]
    User --> Detect{🧠 Detecta tipo<br/>de mensaje}
    Detect -->|Saludo| T1[💚 Tipo 1<br/>Respuesta corta]
    Detect -->|Casual| T2[💚 Tipo 2<br/>Conversacional]
    Detect -->|Follow-up| T3[💚 Tipo 3<br/>Continúa hilo]
    Detect -->|Sustantiva| T4[🔴 Tipo 4<br/>Formato Mentor]
    T1 --> Role{👔 Rol del usuario}
    T2 --> Role
    T3 --> Role
    T4 --> Role
    Role -->|Asesor| Out([📤 Tono operativo<br/>llamadas a clientes])
    Role -->|Channel| OutC([📤 Tono partner<br/>documentación + semi-liderazgo])
    Role -->|Líder| OutL([📤 Tono gerencial<br/>manda asesor + channel])
    Role -->|Project M| OutPM([📤 Tono ejecutivo<br/>jefe de áreas del call center])

    style Detect fill:#fbbf24,color:#000
    style T4 fill:#1B3A5C,color:#fff
    style Role fill:#a78bfa,color:#fff
    style Out fill:#F7941D,color:#fff
    style OutC fill:#F7941D,color:#fff
    style OutL fill:#F7941D,color:#fff
    style OutPM fill:#1B3A5C,color:#fff
```

**Jerarquía del call center:**
- 📞 **Asesor** — llamadas a clientes (operativo)
- 📋 **Channel** — documentación + semi-liderazgo del grupo
- 👔 **Líder** — manda Asesor + Channel del equipo
- 🎯 **Project M** — jefe de Asesores, Channel y Líderes de todas las áreas

> 🔍 **Calidad** opera aparte: evalúan llamadas y apoyan asignación de citas. No están en la cadena de mando.

### 🟢 BLOQUE D — UX/UI ✅

```mermaid
flowchart LR
    UI[🎨 UI Windmar]
    UI --> D1[🌙 Dark/Light]
    UI --> D2[🤖 SUN BOT 6 estados]
    UI --> D3[💬 Burbujas + avatares]
    UI --> D4[📱 Responsive]
    UI --> D5[✨ Glassmorphism]
    UI --> D6[💡 Tips rotativos]
    UI --> D7[🌟 Welcome glowmorphism]

    D2 --> S1[idle]
    D2 --> S2[typing]
    D2 --> S3[thinking]
    D2 --> S4[happy]
    D2 --> S5[error]
    D2 --> S6[loading]

    style UI fill:#1B3A5C,color:#fff
```

### 🟢 BLOQUE H — Auth + Perfil v1 ✅ (REEMPLAZADO por BLOQUE I)

> Sistema de email + password de Supabase Auth. Funcional pero reemplazado por SSO corporativo.

### 🟡 BLOQUE I — Migración Next.js + SSO Microsoft 📍 EN CURSO

```mermaid
flowchart TD
    Migration[🔄 Migración Next.js + SSO]
    Migration --> M1[📦 Reescritura completa<br/>Vite → Next.js 15]
    Migration --> M2[🔐 NextAuth v5<br/>+ Microsoft Entra ID]
    Migration --> M3[🗄️ Refactor DB<br/>user_id → user_email]

    M2 --> Login[🚪 Login simplificado]
    Login --> L1[Botón único<br/>'Iniciar sesión con Microsoft']
    L1 --> L2[Sesión 8h<br/>JWT cifrado]
    L2 --> L3[Solo @windmarhome.com<br/>validación tenant + dominio]

    M3 --> DB1[Tabla user_roles<br/>display_name, departamento, rol]
    M3 --> DB2[conversations.user_email<br/>migrado desde user_id]

    style Migration fill:#fbbf24,color:#000
    style M1 fill:#1B3A5C,color:#fff
    style M2 fill:#1B3A5C,color:#fff
    style M3 fill:#1B3A5C,color:#fff
```

**Stack nuevo:**

| Capa | Antes (v1) | Ahora (v2) |
|---|---|---|
| Framework | React + Vite | **Next.js 15** + React 19 |
| Auth | Supabase Auth (email/password) | **NextAuth v5** + Microsoft Entra ID |
| Sesiones | Token Supabase | **JWT cifrado, 8h TTL** |
| Identidad | UUID `auth.users.id` | **Email corporativo** |
| Profile data | `auth.users.user_metadata` | Tabla `user_roles` |
| Acceso DB | Anon key + RLS | **Service role + checks en API layer** |
| Email | Resend SMTP via Supabase | **Removido** (decisión: SSO es self-explanatory) |

**Flujo SSO completo:**

```mermaid
sequenceDiagram
    participant U as Asesor
    participant A as App Next.js
    participant M as Microsoft Entra ID
    participant S as Supabase

    U->>A: Click "Iniciar sesión con Microsoft"
    A->>M: Redirect a login.microsoftonline.com
    U->>M: Autentica con cuenta Windmar
    M->>A: Callback con auth code
    A->>M: Intercambia code por tokens
    A->>A: Valida @windmarhome.com
    A->>S: Upsert user_roles (auto-provision)
    S-->>A: Perfil listo
    A->>U: Cookie sesión (8h) + redirect al chat
```

### 🟡 BLOQUE E — Validación (próximo, después de SSO)

```mermaid
flowchart TD
    E[👥 Pilotaje]
    E --> E1[3-5 asesores<br/>con cuenta Windmar]
    E1 --> E2[📊 Monitor<br/>Dashboard Groq + logs Vercel]
    E2 --> E3[📝 Feedback<br/>cualitativo]
    E3 --> E4{¿Respuestas<br/>buenas?}
    E4 -->|Sí| E5[✅ Aprobación<br/>gerencia]
    E4 -->|No| E6[🔧 Ajustar<br/>prompt + KB]
    E6 --> E1
    E5 --> Next([➡️ Bloque F])

    style E fill:#94a3b8,color:#fff
    style Next fill:#22c55e,color:#fff
```

### ⏳ BLOQUE F — Optimización (próximo)

```mermaid
flowchart LR
    F1[🤖 Migrar<br/>a Claude API]
    F2[👍👎 Botones<br/>feedback]
    F3[📈 Tabla<br/>métricas]
    F4[👨‍💼 Dashboard<br/>admin]

    F1 --> F2
    F2 --> F3
    F3 --> F4

    style F1 fill:#a78bfa,color:#fff
    style F2 fill:#a78bfa,color:#fff
    style F3 fill:#94a3b8,color:#fff
    style F4 fill:#94a3b8,color:#fff
```

### 🔮 BLOQUE G — Integraciones Futuras

```mermaid
flowchart TD
    Future[🔮 Fase 2 del proyecto]
    Future --> G1[💼 Zoho CRM<br/>Deal # → Producto]
    Future --> G2[📅 Citas automáticas]
    Future --> G3[📊 Reportes semanales]
    Future --> G4[🔔 Notificaciones push]
    Future --> G5[🌐 Multi-idioma]

    style Future fill:#a78bfa,color:#fff
```

---

## 🛣️ Línea de Tiempo

```mermaid
gantt
    title Ruta hacia v1.0 Producción
    dateFormat YYYY-MM-DD
    axisFormat %d %b

    section Fase 1-3 (Hecho)
    Infraestructura      :done,    a1, 2026-03-01, 7d
    Knowledge Base       :done,    b1, 2026-03-08, 14d
    Prompt + UI          :done,    c1, 2026-03-22, 21d
    Auth + Perfil v1     :done,    h1, 2026-04-29, 2d
    Email pro Resend     :done,    h2, 2026-05-04, 1d

    section Fase 4 (Ahora)
    Migración Next.js    :done,    i1, 2026-05-07, 1d
    SSO Microsoft        :active,  i3, 2026-05-07, 5d

    section Fase 5 (Próximo)
    Pilotaje asesores    :         e1, 2026-05-12, 14d
    Migrar a Claude API  :         f1, 2026-05-26, 3d
    Botones feedback     :         f2, 2026-05-29, 3d
    Demo gerencia        :         f3, 2026-06-01, 2d

    section Lanzamiento
    🎯 v1.0 Producción   :crit,    v1, 2026-06-03, 1d
```

---

## 🎯 Prioridades Esta Semana

```mermaid
quadrantChart
    title Importancia vs Urgencia
    x-axis Bajo Esfuerzo --> Alto Esfuerzo
    y-axis Bajo Impacto --> Alto Impacto
    quadrant-1 Hacer Ya
    quadrant-2 Planificar
    quadrant-3 Delegar
    quadrant-4 Ignorar

    Esperar credenciales IT: [0.1, 0.95]
    Test SSO en localhost: [0.3, 0.9]
    Deploy prod con maintenance window: [0.4, 0.85]
    Comunicar cambio a asesores: [0.2, 0.7]
    Pilotaje post-SSO: [0.4, 0.6]
    Migrar Claude: [0.5, 0.5]
    Botones feedback: [0.4, 0.4]
```

---

## 🚦 Semáforo de Riesgos

```mermaid
flowchart LR
    R1[🟠 Rate limit Groq<br/>30 RPM free] -->|Mitigación| M1[Migrar a Claude<br/>o pagar Groq]
    R2[🟢 KB incompleto] -->|Mitigación| M2[Asesores reportan<br/>qué falta]
    R3[🟡 Adopción baja] -->|Mitigación| M3[Demo + onboarding]
    R4[🟡 Info desactualizada] -->|Mitigación| M4[Update trimestral]
    R5[🟢 Costo API] -->|Mitigación| M5[Claude $3/M tokens]
    R6[🟡 SSO falla en prod] -->|Mitigación| M6[Test localhost<br/>+ rollback Vercel<br/>+ maintenance window]

    style R1 fill:#f97316,color:#fff
    style R2 fill:#22c55e,color:#fff
    style R3 fill:#fbbf24,color:#000
    style R4 fill:#fbbf24,color:#000
    style R5 fill:#22c55e,color:#fff
    style R6 fill:#fbbf24,color:#000
```

---

## 📅 Bitácora de Cambios

### 7 mayo 2026 — Migración Next.js + SSO Microsoft 🆕

**Reescritura completa Vite → Next.js 15:**
- Proyecto nuevo en paralelo: `windmar-ai-agent-next/` (44 archivos, 0 errores de build)
- App actual `WINDMAR-AI-AGENT-main/` sigue corriendo intacto en producción durante la migración
- Stack: Next.js 15 + React 19 + TypeScript + NextAuth v5
- Todos los componentes (Sidebar, ChatWindow, ChatMessage, MascotPanel, etc.) migrados con `'use client'`
- Endpoint `api/chat.ts` (Vercel function) → `app/api/chat/route.ts` (Next.js route handler con streaming)
- Nuevos endpoints: `/api/conversations`, `/api/conversations/[id]`, `/api/messages`, `/api/profile`
- SYSTEM_PROMPT extraído a `src/lib/prompts.ts` para mejor mantenimiento

**SSO Microsoft Entra ID via NextAuth v5:**
- Provider built-in `microsoft-entra-id`
- Restricción a dominio `@windmarhome.com` en callback `signIn`
- Sesión JWT cifrada de 8 horas (auto-logout al final del turno)
- Middleware protege todas las rutas (excepto `/login` y assets estáticos)
- LoginScreen rediseñado: un solo botón "Iniciar sesión con Microsoft" (logo oficial 4 cuadrados)
- Eliminados: pantalla de registro, flip card 3D, recuperar contraseña, validación de email duplicado — Microsoft maneja todo

**Refactor de identidad y base de datos:**
- Tabla nueva `user_roles` reemplaza `auth.users.user_metadata` para `display_name`, `departamento`, `rol`
- `conversations.user_id` (UUID) → `conversations.user_email` (TEXT) — backfill incluido
- Migraciones SQL: `004_user_roles.sql` + `005_conversations_email.sql`
- RLS sin políticas → solo `service_role` accede (más simple, validación a nivel API)

**Decisión: sin emails / sin DNS**
- Se descartó la verificación DNS de `windmarhome.com` en GoDaddy/Resend
- Welcome email REMOVIDO — el SSO es self-explanatory: el asesor sabe que entró cuando ve a Microsoft autenticarlo
- `resend` y dependencias eliminadas del proyecto (-18 paquetes, middleware más liviano)
- Si en el futuro se requiere email, se puede agregar Microsoft Graph API (Mail.Send) sin necesidad de DNS

**Solicitudes a IT:**
- ⏳ Client ID + Client Secret + Tenant ID del App Registration en Azure
- 📌 Redirect URI registrada: `https://windmar-ai-agent.vercel.app/api/auth/callback/microsoft-entra-id`

**Plan de despliegue:**
- Test local en `http://localhost:3000` cuando llegue creds
- Ventana de mantenimiento ~10 min para deploy a producción
- Mismo URL público `windmar-ai-agent.vercel.app` (Vercel auto-detecta cambio Vite → Next.js)
- Rollback inmediato disponible vía dashboard Vercel si falla

---

### 4 mayo 2026 — Email profesional con Resend + Reset total + IT ticket

**Reset total y rebuild:**
- Eliminados todos los usuarios, conversaciones y sesiones
- Cleanup adicional de `auth.identities` (residuales que bloqueaban signup)
- Base de datos virgen lista para pilotaje

**Email profesional via Resend SMTP:**
- Cuenta Resend creada (workspace "windmarhome")
- API key generada y guardada en Supabase SMTP Settings
- Configuración SMTP completada:
  - Host: `smtp.resend.com`
  - Port: `465`
  - Username: `resend`
  - Sender temporal: `onboarding@resend.dev`
- Plantilla HTML personalizada en Supabase con branding Windmar
- Subject: "¡Bienvenido al Agente Windmar Home! ☀️"

**Identificadas 2 limitaciones del free tier:**
- ⚠️ Sender `onboarding@resend.dev` solo permite enviar al dueño del workspace
- ⚠️ Imágenes externas bloqueadas por defecto en clientes (Gmail/Outlook)
- ✅ Solución temporal: email confirmation desactivado para fase de pilotaje

**Solicitud DNS enviada a IT (iNubo):**
- Dominio `windmarhome.com` agregado en Resend
- 3 records DNS generados (1 MX + 2 TXT para SPF/DKIM)
- Ticket creado en sistema iNubo Managed
- Estado: ⏳ Esperando respuesta de IT

**Queries SQL para Project M:**
- 5 queries listos para monitorear conversaciones de TODOS los asesores
- Resumen de actividad, mensajes por usuario, preguntas frecuentes
- Estadísticas para reportar a gerencia

---

### 🔮 PENDIENTES — Por hacer cuando IT entregue lo que falta

| # | Tarea | Cuándo | Bloqueado por |
|---|---|---|---|
| 1 | Recibir Client ID + Secret + Tenant ID de Azure | ⏳ | IT |
| 2 | Pegar 4 variables en `.env.local` y probar SSO en localhost | 1 día | Credenciales IT |
| 3 | Correr migraciones SQL `004` y `005` en Supabase | 30 min | — |
| 4 | Push a GitHub + deploy Vercel + smoke test | 1 hora | Test local OK |
| 5 | Ventana de mantenimiento + comunicar a asesores | 30 min | Deploy listo |

**Beneficios después del SSO:**
- ✅ Cero passwords que recordar — entrada con cuenta Microsoft Windmar
- ✅ Acceso restringido a nivel de tenant Azure (más seguro que validación frontend)
- ✅ Auto-logout 8h alineado al turno de trabajo
- ✅ Flujo idéntico al resto de apps Windmar (TechSupportHub etc.)
- ✅ Sin dependencia de DNS, GoDaddy ni servicios de email externos

---

### 1 mayo 2026 — Roles ampliados + Chat estilo ChatGPT + Anti-alucinación

**Roles del asesor:**
- Renombrado "Jefe" → **Líder** (terminología más actual)
- Nuevo rol **Project M** (Project Manager — jefe de líderes)
- 4 niveles de tono ahora: Asesor / Líder / Channel / Project M

**Rediseño de chat tipo ChatGPT:**
- Burbuja IA eliminada (sin fondo, sin borde, sin sombra)
- Texto IA fluye libre estilo ChatGPT
- Avatar SUN BOT mantenido al lado
- Cursor parpadeante streaming mantenido

**Reglas anti-alucinación (críticas):**
- 🔴 REGLA #0 — Lista cerrada de 10 herramientas reales
- 🔴 REGLA #1 — Solo precios literales del knowledge_base
- 🔴 REGLA #2 — Si hay duda, omite

---

### 30 abril 2026 — Auth avanzado + perfil de usuario (v1, ahora reemplazado)

**Login/Registro completamente rediseñado:**
- Tarjeta con animación 3D flip
- Cara frontal: login + recuperar contraseña
- Cara trasera: registro completo
- T&C versionado v1.0

**Sistema de perfil:**
- ProfileModal con campos editables
- Datos persisten en `user_metadata` de Supabase

**Nota:** este sistema fue reemplazado el 7 mayo por SSO Microsoft. El ProfileModal sigue vivo pero ahora escribe a la tabla `user_roles` en lugar de `user_metadata`.

---

## 📍 ¿Cómo ver este mapa?

### Opción 1 — GitHub (más fácil) ✨
1. Ya está en tu repo: `ROADMAP.md`
2. Abre el archivo en GitHub web
3. Los diagramas se renderizan **automáticamente**
4. Link directo: `https://github.com/JnSbstnRivera/WINDMAR-AI-AGENT/blob/main/ROADMAP.md`

### Opción 2 — Mermaid Live Editor
1. Ve a https://mermaid.live
2. Copia/pega cualquier bloque ` ```mermaid ` de este archivo
3. Lo ves en tiempo real, lo descargas como PNG/SVG

### Opción 3 — VS Code
1. Instala extensión "Markdown Preview Mermaid Support"
2. Abre `ROADMAP.md`
3. `Ctrl+Shift+V` para preview

---

## 🔄 Cómo actualizar este mapa

Cuando completes algo:
1. Cambia `🔄` por `✅`
2. Cambia colores `fbbf24` (amarillo) por `22c55e` (verde)
3. Mueve la flecha de "📍 ESTAMOS AQUÍ" al siguiente bloque
4. Push a GitHub → mapa actualizado para todos

---

**Última actualización**: 7 mayo 2026
**Próxima revisión sugerida**: cuando IT entregue las credenciales del App Registration de Azure
