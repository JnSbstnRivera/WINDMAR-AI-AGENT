---
tags: [env, configuración, secretos, setup]
fecha: 2026-05-26
---

# 🔧 Variables de entorno

## Archivo `.env.local` (no commiteado)

```bash
# ─────────────────────────────────────────────────────────
# NEXTAUTH (sesiones encriptadas)
# ─────────────────────────────────────────────────────────
AUTH_SECRET=                          # Genera con: npx auth secret

# ─────────────────────────────────────────────────────────
# MICROSOFT ENTRA ID — SSO + Mail.Send
# ─────────────────────────────────────────────────────────
AUTH_MICROSOFT_ENTRA_ID_ID=           # Application (client) ID de Azure
AUTH_MICROSOFT_ENTRA_ID_SECRET=       # Client secret VALUE (no el ID)
AUTH_MICROSOFT_ENTRA_ID_ISSUER=       # Tenant ID o URL completa del issuer

# ─────────────────────────────────────────────────────────
# SUPABASE (server-side — RAG + persistencia)
# ─────────────────────────────────────────────────────────
SUPABASE_URL=https://psyfmkmlmvrijdxsirph.supabase.co
SUPABASE_SERVICE_ROLE_KEY=            # Secreto server-side

# ─────────────────────────────────────────────────────────
# ANTHROPIC (Claude Haiku 4.5)
# ─────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=                    # API key de console.anthropic.com
# Si corres con Claude Code, usa WH_CLAUDE_KEY (ver nota abajo)

# ─────────────────────────────────────────────────────────
# ADMINS DEL DASHBOARD
# ─────────────────────────────────────────────────────────
ADMIN_EMAILS=juan.s@windmarhome.com,otros@windmarhome.com

# ─────────────────────────────────────────────────────────
# URL PÚBLICA (firmas de correo)
# ─────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://windmar-ai-agent.vercel.app
```

---

## ⚠️ Claude Code scrubbing

> [!warning] Si corres el dev server desde Claude Code
> Claude Code **limpia automáticamente** la variable `ANTHROPIC_API_KEY` del entorno por seguridad (para que el agente no la lea).
>
> Solución: usa un nombre alterno en `.env.local`, ej. `WH_CLAUDE_KEY`. En el código:
> ```typescript
> apiKey: process.env.WH_CLAUDE_KEY || process.env.ANTHROPIC_API_KEY
> ```

---

## Setup en Vercel

Las variables se configuran en **Vercel Dashboard → Settings → Environment Variables**.

### Por ambiente

| Variable | Production | Preview | Development |
|----------|------------|---------|-------------|
| `AUTH_SECRET` | ✅ único | ✅ único | ✅ local |
| `AUTH_MICROSOFT_ENTRA_ID_*` | ✅ | ⚠️ ojo redirect URIs | ✅ |
| `SUPABASE_*` | ✅ | ✅ | ✅ |
| `ANTHROPIC_API_KEY` | ✅ | ✅ | ✅ |
| `ADMIN_EMAILS` | ✅ | ✅ | ✅ |
| `NEXT_PUBLIC_APP_URL` | producción URL | preview URL | localhost:3000 |

> [!warning] Preview deploys + Microsoft Entra
> Cada preview deploy de Vercel tiene una URL distinta. Microsoft Entra requiere que la `Redirect URI` esté registrada en el App Registration. Por eso los preview deploys con SSO **fallan** con `AADSTS50011`.
>
> Workaround: testear en localhost (URI ya registrada) y solo deployar a main cuando funcione.

---

## Configurar Microsoft Entra (one-time, hecho por IT)

### App Registration en Azure

1. **App Registration nueva** en el tenant de Windmar
2. **Redirect URIs**:
   - `http://localhost:3000/api/auth/callback/microsoft-entra-id` (dev)
   - `https://windmar-ai-agent.vercel.app/api/auth/callback/microsoft-entra-id` (prod)
3. **API permissions**:
   - `User.Read` (delegated, ya viene por defecto)
   - `Mail.Send` (delegated, agregada manualmente)
4. **Client secret** generado y copiado al `.env`
5. **Token configuration** — agregar claim `email` opcional

### Lo que verá el asesor

Primera vez que entra:
1. Popup de Microsoft con cuenta corporativa
2. Consent: *"WINDMAR-AI-AGENT quiere acceder a tu perfil"* → Aceptar
3. Si tiene `Mail.Send`, segundo consent: *"...enviar correos como tú"* → Aceptar
4. Listo, no vuelve a aparecer.

---

## Variables computadas internamente

Algunas variables se calculan al inicio, no se guardan en `.env`:

| Variable | Valor | Fuente |
|----------|-------|--------|
| `runtime` | `'nodejs'` | exportado en API routes (vs `'edge'`) |
| `maxDuration` | `30` segundos | timeout de Vercel para streaming |
| `cookieName` | `__Secure-authjs.session-token` (prod) o `authjs.session-token` (dev) | NextAuth |

---

## Secretos en Supabase

| Secreto | Dónde se usa |
|---------|--------------|
| `SUPABASE_URL` | Server + cliente |
| `SUPABASE_SERVICE_ROLE_KEY` | **Solo server** (bypass RLS) |
| (no usamos anon key) | — |

> [!warning] Nunca expongas el service role key al cliente
> Si lo expones, cualquier persona puede leer/escribir cualquier tabla. Por eso este proyecto **no usa el cliente Supabase del navegador** — todo va por API routes Next.js.

---

## Generar nuevos secrets

```bash
# Auth secret
npx auth secret

# Inspeccionar un JWT de NextAuth (debugging)
echo $JWT_TOKEN | base64 -d
```

---

## Conexiones

- 🔐 Cómo se usa la SSO: [[03 - Flujo de pregunta]]
- 🚀 Cómo se setean en Vercel: [[14 - Deploy]]
- 📧 Mail.Send específicamente: [[08 - Sistema de correos]]

[[00 🌞 MOC|← Volver al MOC]]
