# WINDMAR AI AGENT

Agente de inteligencia artificial para el call center de **Windmar Home Puerto Rico** — la empresa líder en energía solar, roofing, productos de agua y baterías portátiles con más de 22 años de experiencia en la isla.

---

## ¿Qué hace?

Es un chat de IA diseñado para los asesores del call center. El agente:

- Responde preguntas sobre productos, procesos de venta y manejo de objeciones
- Recomienda la herramienta correcta (cotizador o calculadora) según la conversación
- Aplica psicología de ventas consultiva para ayudar a cerrar
- Guarda el historial de conversaciones por asesor
- Acceso solo para correos `@windmarhome.com`

---

## Herramientas del Call Center

| Herramienta | URL | Área |
|---|---|---|
| LUMA Scanner | https://luma-scanner-two.vercel.app/ | Telemercadeo, Ventas |
| Cotizador Loan | https://cotizador-loan.vercel.app/ | VASS, Ventas |
| Cotizador Lease / PPA | https://cotizador-lease-ppa.vercel.app/ | VASS, Ventas |
| Cotizador Roofing Pro | https://cotizador-roofing-pro.vercel.app/ | Todos |
| Cotizador Agua | https://cotizador-agua.vercel.app/ | Todos |
| Calculadora Anker | https://calculador-anker.vercel.app/ | Todos |
| Calculadora Placas x Aires | https://calculadora-placas-aires-acondicion.vercel.app/ | VASS, Ventas |
| Calculadora Solar EV | https://calculadora-solar-ev.vercel.app/ | Ventas |
| Proyecto Completo | https://proyecto-completo-three.vercel.app/ | Todos |
| Panel General | https://panel-de-herramientas-call-center.vercel.app/ | Todos |

---

## Áreas del Call Center

- **Telemercadeo** — Prospectan bases de datos, ofrecen productos y agendan citas
- **VASS** — Corren crédito. Loan si aprueba, Lease (LightReach) como alternativa
- **Ventas** — Consultores telefónicos con orientación completa y cierre de contratos

---

## Stack Técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 4 |
| Backend | Vercel Serverless Functions (Node.js) |
| Base de datos | Supabase (PostgreSQL + RLS) |
| Autenticación | Supabase Auth (solo @windmarhome.com) |
| IA | Groq — llama-3.3-70b-versatile (streaming) |
| Búsqueda | Supabase RPC full-text search en español |

---

## Despliegue

**Producción:** https://windmar-ai-agent.vercel.app

Variables de entorno necesarias en Vercel:

```
GROQ_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

---

## Estructura del Proyecto

```
WINDMAR-AI-AGENT/
├── api/
│   ├── chat.ts          # Serverless function — Groq streaming
│   └── package.json     # CommonJS override para Vercel
├── src/
│   ├── components/
│   │   ├── ChatMessage.tsx   # Renderizado markdown + hipervínculos
│   │   ├── ChatWindow.tsx
│   │   ├── ChatInput.tsx
│   │   ├── Sidebar.tsx       # Historial + borrar conversaciones
│   │   ├── LoginScreen.tsx   # Auth @windmarhome.com
│   │   └── WelcomeScreen.tsx
│   ├── lib/supabase.ts
│   ├── types.ts
│   └── App.tsx
├── supabase/
│   ├── 01_schema.sql         # Tablas + RLS
│   ├── 02_seed_tools.sql     # Base de conocimiento inicial
│   └── 03_seed_missing_tools.sql
├── public/
│   └── favicon.svg
└── vercel.json
```

---

*Desarrollado para Windmar Home Puerto Rico — Call Center Operations*
