# WINDMAR AI AGENT (SUN BOT)

Asistente de IA interno de Windmar Home Puerto Rico: un chat conversacional (PWA instalable) con base de conocimiento propia e integración con Zoho CRM en lenguaje natural, para que los equipos de ventas y administración consulten clientes, gestionen su cartera y registren notas sin salir del chat.

## ✨ Características

- **Chat con IA** sobre la base de conocimiento de Windmar (Claude Haiku 4.5, vía `@anthropic-ai/sdk`).
- **Agente Zoho en lenguaje natural** (tool-use): buscar cliente, ver mis leads / cartera, asignar leads, agregar nota (con firma SUN BOT), briefing y coach.
- **Permisos por rol:** la escritura en Zoho queda restringida a roles elevados; el Asesor tiene solo lectura de su propia cartera.
- **Autenticación corporativa** con Microsoft Entra ID vía NextAuth (Auth.js).
- **PWA instalable** (manifest + service worker).
- **Panel de administración:** dashboard de métricas, gestión, asignación, auditoría, usuarios y configuración de Zoho; aprobación y alta manual de usuarios; multidominio.
- **Persistencia en Supabase:** conversaciones, mensajes, feedback y knowledge base (server-side).
- **Carga de documentos** a la base de conocimiento.

## 🛠️ Stack

- **Framework:** Next.js 15 (App Router) + React 19
- **Lenguaje:** TypeScript
- **IA:** Anthropic Claude (Haiku 4.5) vía `@anthropic-ai/sdk`
- **Auth:** NextAuth / Auth.js + Microsoft Entra ID
- **Base de datos:** Supabase (Postgres)
- **CRM:** Zoho CRM (OAuth 2.0 Self-Client)
- **UI/Markdown:** Tailwind CSS 4, react-markdown + remark-gfm, Recharts
- **Deploy:** Vercel

## 🚀 Setup local

```bash
npm install
cp .env.example .env.local   # rellena los valores
npm run dev
```

Abre http://localhost:3000.

## 🔑 Variables de entorno

| Variable | Descripción |
|---|---|
| `AUTH_SECRET` | Secreto de NextAuth (genera con `npx auth secret`). Secreto. |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | Application (client) ID del App Registration en Azure. |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | Client secret (VALUE) del App Registration. Secreto. |
| `AUTH_MICROSOFT_ENTRA_ID_ISSUER` | Tenant ID o URL completa del issuer. |
| `SUPABASE_URL` | URL del proyecto Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase. Secreta, solo servidor. |
| `ANTHROPIC_API_KEY` / `WH_CLAUDE_KEY` | API key de Anthropic (motor de IA del chat). Secreta. |
| `ZOHO_CLIENT_ID` | Client ID del Self-Client de Zoho. Secreto. |
| `ZOHO_CLIENT_SECRET` | Client secret de Zoho. Secreto. |
| `ZOHO_REFRESH_TOKEN` | Refresh token de Zoho (no expira). Secreto. |
| `ZOHO_ORG_ID` | Org ID de Zoho CRM. |
| `ZOHO_API_DOMAIN` | Dominio de la API de Zoho según datacenter (US/EU/IN). |
| `ADMIN_EMAILS` / `SUPERADMIN_EMAILS` | Correos con rol admin / super admin. |
| `ALLOWED_EMAIL_DOMAINS` | Dominios corporativos permitidos para login. |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app. |

(Solo placeholders; nunca incluyas keys, tokens ni service role reales.)

## 📜 Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción
- `npm run start` — sirve el build
- `npm run lint` — Next lint

## 🌐 Deploy

- Vercel (framework Next.js). Configura todas las variables de entorno (Entra ID, Supabase, Anthropic y Zoho) en el proyecto. El middleware de NextAuth debe excluir `manifest.webmanifest` y `sw.js` para que la PWA siga siendo instalable.

## 📄 Licencia

Propietario — Windmar Home PR. Uso interno.
