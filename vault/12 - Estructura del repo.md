---
tags: [estructura, archivos, código, repo]
fecha: 2026-05-26
---

# 📁 Estructura del repositorio

```
WINDMAR-AI-AGENT/
├── src/
│   ├── auth.ts                       # NextAuth + Microsoft SSO + refresh tokens
│   ├── types.ts                      # Tipos compartidos (Conversation, Message, etc.)
│   ├── middleware.ts                 # Protección de rutas
│   │
│   ├── lib/
│   │   ├── supabase.ts               # Cliente admin server-side
│   │   ├── prompts.ts                # 🧠 SYSTEM_PROMPT (~480 líneas)
│   │   ├── tools.ts                  # Motor de recomendación + filterToolsMentionedInText
│   │   ├── email-templates.ts        # 6 plantillas + renderTemplate + renderCustomEmail
│   │   ├── easter-eggs.ts            # SUNBOT_ART · TEMBLOR_TEXT · ABOUT_TEXT
│   │   └── admin-auth.ts             # Allowlist admins
│   │
│   ├── hooks/
│   │   ├── useTypewriter.ts          # Animación typewriter
│   │   └── useAdminThemeColors.ts    # Colores del tema admin
│   │
│   ├── app/
│   │   ├── page.tsx                  # Home (chat principal)
│   │   ├── layout.tsx                # Layout raíz
│   │   ├── globals.css               # Tailwind + variables + animations
│   │   ├── login/page.tsx            # Login SSO con glow naranja
│   │   ├── admin/
│   │   │   ├── page.tsx              # Dashboard de métricas
│   │   │   └── admin-theme.css       # Theme Executive 2026
│   │   └── api/
│   │       ├── chat/route.ts                # POST — streaming Claude
│   │       ├── conversations/
│   │       │   ├── route.ts                 # GET (lista), POST (crear), DELETE (borrar todas)
│   │       │   ├── [id]/route.ts            # DELETE individual
│   │       │   └── search/route.ts          # Búsqueda full-text
│   │       ├── messages/route.ts            # Guardar
│   │       ├── feedback/route.ts            # 👍/👎
│   │       ├── upload-document/route.ts     # Análisis con visión IA
│   │       ├── email/send/route.ts          # Microsoft Graph sendMail
│   │       ├── admin/metrics/route.ts       # Métricas (7 RPCs en paralelo)
│   │       └── auth/[...nextauth]/route.ts  # NextAuth handler
│   │
│   └── components/                   # ~30 componentes React
│       ├── ChatApp.tsx               # ⭐ Orquestador principal
│       ├── ChatInput.tsx             # Input + adjuntar archivo
│       ├── ChatWindow.tsx            # Lista de mensajes
│       ├── WelcomeScreen.tsx         # Pantalla inicial con partículas
│       ├── Sidebar.tsx               # Conversaciones + búsqueda + Tip del día
│       ├── UserAvatar.tsx            # Avatar con foto MS o iniciales
│       ├── ToolCards.tsx             # Tarjetas neón de herramientas
│       ├── QualityCard.tsx           # Matriz de calidad (3 variantes)
│       ├── OnboardingModal.tsx       # Modal primera vez
│       ├── OnboardingGate.tsx        # Bloquea chat hasta completar onboarding
│       ├── FollowUpEmailModal.tsx    # ⭐ Modal /@
│       ├── WindmarSnake.tsx          # 🐍 Easter egg
│       ├── WindmarPong.tsx           # 🏓 Easter egg
│       ├── WindmarInvaders.tsx       # 👾 Easter egg
│       └── admin/                    # Componentes del dashboard
│           ├── AdminDashboard.tsx
│           ├── MetricCard.tsx
│           ├── UsageChart.tsx
│           ├── QualityDonut.tsx
│           ├── DepartmentChart.tsx
│           ├── HourlyChart.tsx
│           ├── TopAsesoresTable.tsx
│           ├── DownvotesTable.tsx
│           └── ConversationsList.tsx
│
├── supabase/
│   └── migrations/                   # SQL versionado
│       ├── 001_initial_schema.sql
│       ├── 002_*.sql
│       ├── ...
│       └── 010_usage_by_month_only_active.sql
│
├── public/
│   ├── sunbot.png                    # Mascota base
│   ├── sunbot-feliz.png              # SUN BOT con sonrisa (juegos)
│   ├── sunbot-pensando.png           # Estado pensando
│   ├── sunbot-escribiendo.png        # Estado typing
│   ├── sunbot-cargando.png           # Estado loading
│   ├── sunbot-error.png              # Estado error
│   ├── logo-inicial-chat.png         # Logo grande del welcome
│   └── email-assets/
│       └── windmar-logo.gif          # Logo firma correo (294KB)
│
├── vault/                            # ⭐ Documentación Obsidian
│   ├── 00 🌞 MOC.md
│   ├── 01 - Visión y propósito.md
│   ├── 02 - Arquitectura.md
│   ├── ...este vault...
│
├── .env.example                      # Template de variables
├── .env.local                        # Secretos locales (gitignored)
├── package.json                      # Dependencias
├── tsconfig.json                     # TypeScript config
├── tailwind.config.ts                # Tailwind config
├── next.config.ts                    # Next.js config
└── GUIA-MAESTRA-REPLICACION-WINMARD-AGENT-AI.md  # Para que otras áreas repliquen
```

---

## Archivos clave (los más editados)

| Archivo | Por qué importa |
|---------|-----------------|
| **`src/lib/prompts.ts`** | El cerebro del bot — cualquier cambio afecta TODAS las respuestas |
| **`src/components/ChatApp.tsx`** | Orquestador del chat + comandos slash + modales |
| **`src/app/api/chat/route.ts`** | El endpoint principal — RAG + LLM streaming |
| **`src/lib/tools.ts`** | Lógica de recomendación de herramientas + filtros |
| **`src/auth.ts`** | SSO + tokens Microsoft Graph + refresh |

---

## Conexiones

- 🏗️ Vista general del sistema: [[02 - Arquitectura]]
- 🗄️ Las migraciones SQL: [[04 - Esquema Supabase#Migraciones]]

[[00 🌞 MOC|← Volver al MOC]]
