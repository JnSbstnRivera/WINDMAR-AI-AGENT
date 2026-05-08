# WINDMAR AI AGENT — Next.js + Microsoft SSO

App migrada del proyecto Vite original. Stack:

- **Next.js 15** + **React 19** + **TypeScript**
- **NextAuth v5** + **Microsoft Entra ID** (SSO Windmar)
- **Supabase** (base de datos: conversations, messages, knowledge_base, user_roles)
- **Groq** (motor LLM — `llama-3.3-70b-versatile`)
- **Tailwind CSS v4**

---

## Estado actual

✅ Migración completa — código compilado y listo.
⏸️ **Pendiente solo de:** Client ID + Client Secret + Tenant ID que IT debe entregar.

---

## Cuando IT entregue los datos — pasos para activar el SSO

### 1. Rellenar `.env.local` en este directorio

```bash
AUTH_SECRET=<ya_generado_no_tocar>
AUTH_MICROSOFT_ENTRA_ID_ID=<APPLICATION_CLIENT_ID_DE_AZURE>
AUTH_MICROSOFT_ENTRA_ID_SECRET=<CLIENT_SECRET_VALUE_DE_AZURE>
AUTH_MICROSOFT_ENTRA_ID_ISSUER=<TENANT_ID>

SUPABASE_URL=https://psyfmkmlmvrijdxsirph.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<copiar_del_dashboard_de_supabase>

GROQ_API_KEY=<copiar_del_proyecto_viejo>
```

> **Service role key:** Supabase Dashboard → Settings → API → `service_role` key (la secreta, NO la `anon`)

### 2. Ejecutar migraciones SQL en Supabase

En orden, en el SQL Editor de Supabase:

1. `supabase/migrations/004_user_roles.sql` — crea tabla `user_roles` y migra metadata existente
2. `supabase/migrations/005_conversations_email.sql` — agrega columna `user_email` a conversations

### 3. Probar localmente

```powershell
npm run dev
```

Abre http://localhost:3000 → debería redirigir a `/login` → click "Iniciar sesión con Microsoft" → autenticarte → vuelves al chat.

### 4. Deploy a producción

**Variables de entorno en Vercel** (Project Settings → Environment Variables):

Mismas que `.env.local`. Asegúrate que `AUTH_MICROSOFT_ENTRA_ID_ISSUER` es el tenant ID correcto.

**Confirmar con IT** que el redirect URI registrado en Azure es:
```
https://windmar-ai-agent.vercel.app/api/auth/callback/microsoft-entra-id
```

---

## Estructura del proyecto

```
windmar-ai-agent-next/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts    # NextAuth handlers
│   │   │   ├── chat/route.ts                  # Chat con Groq
│   │   │   ├── conversations/route.ts         # CRUD conversaciones
│   │   │   ├── conversations/[id]/route.ts    # DELETE individual
│   │   │   ├── messages/route.ts              # Guardar mensajes
│   │   │   └── profile/route.ts               # Update user_roles
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
│   │   ├── ProfileModal.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── WelcomeScreen.tsx
│   ├── lib/
│   │   ├── supabase.ts                        # Cliente admin
│   │   └── prompts.ts                         # SYSTEM_PROMPT del LLM
│   ├── auth.ts                                # Config NextAuth
│   ├── middleware.ts                          # Protección de rutas
│   └── types.ts
├── supabase/migrations/
│   ├── 004_user_roles.sql
│   └── 005_conversations_email.sql
├── public/                                     # Imágenes (sunbot, logo)
├── .env.local                                  # Variables locales (NO Git)
├── .env.example                                # Plantilla
├── package.json
└── README.md
```

---

## Diferencias importantes vs. el proyecto viejo (Vite)

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

## Comandos útiles

```powershell
npm run dev      # Servidor de desarrollo (localhost:3000)
npm run build    # Build de producción
npm run start    # Correr build en local (después de build)
npm run lint     # Linter
```
