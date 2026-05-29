---
tags: [zoho, crm, integración, setup, admin]
fecha: 2026-05-29
estado: producción
---

# 🔍 Integración Zoho CRM

> [!abstract] Qué hace
> El comando `/zoho` (o `/cliente` o `/lead`) busca un cliente en Zoho CRM y devuelve sus datos + sus deals + **sugerencias del Coach IA** sobre qué ofrecerle. También permite auto-completar el modal de correos `/@` con datos del cliente.

---

## 🎯 Cómo se usa

### Comando principal

```
/zoho juan@correo.com
/zoho 787-555-1234
/zoho LD-000123
/zoho María González
```

**Aliases (case-insensitive):**
- `/ZOHO` · `/Zoho` · `/zoho`
- `/cliente`
- `/lead`

### Comportamiento inteligente

| Query | Resultado |
|---|---|
| **Email** (`juan@x.com`) | Búsqueda exacta → card de cliente con coach |
| **Lead Number** (`LD-000123`) | Búsqueda exacta → card de cliente con coach |
| **Teléfono** (7+ dígitos) | Puede haber varios → lista clickeable |
| **Nombre** (texto libre) | Puede haber varios → lista clickeable |

> [!tip] Lista vs Card
> Si tu búsqueda devuelve **1 solo resultado**, el sistema lo abre directamente como card. Si hay **varios**, te muestra una lista de leads para que elijas cuál abrir.

### Auto-completar el modal `/@`

Dentro del modal de correos hay un campo opcional **"🔍 Auto-completar desde Zoho"**. Escribes el email, teléfono o Lead#, click **Buscar** y los campos **Nombre** y **Correo del cliente** se llenan automáticamente.

> Si lo dejas vacío, el modal funciona como siempre (llenado manual).

---

## ⚙️ Setup (para el admin)

### Datos a solicitar a IT

> [!important] Para el dueño del tenant de Zoho de Windmar
> Necesitamos crear un **Self Client** dedicado para WINDMAR-AI-AGENT, separado del de NOTAS-VENTAS-VASS. Esto da independencia: si revocamos uno, el otro sigue funcionando.

#### Información a pedir / tener a mano

1. **Acceso a Zoho API Console** del tenant de Windmar
2. **Confirmación de los scopes** que se pueden conceder (todos delegated):
   - `ZohoCRM.modules.leads.READ`
   - `ZohoCRM.modules.deals.READ`
   - `ZohoCRM.users.READ`
3. **Data center** del tenant (típicamente US `.com` para Windmar PR)

### Paso a paso del Self Client

#### 1. Crear el Self Client

1. Ir a `https://api-console.zoho.com`
2. **Add Client** → **Self Client**
3. **Client Name:** `WINDMAR AI AGENT — Production`
4. **Description:** *(opcional)*
5. **Create**

#### 2. Obtener el grant_code

1. Pestaña **Generate Code** del client recién creado
2. **Scope** (separado por comas SIN espacios):
   ```
   ZohoCRM.modules.leads.READ,ZohoCRM.modules.deals.READ,ZohoCRM.users.READ
   ```
3. **Time Duration:** `10 minutes`
4. **Scope Description:** `WINDMAR AI AGENT Production`
5. Click **CREATE**
6. Te aparecerá un **grant_code** ⚠️ **expira en 10 minutos** — anota el `client_id`, `client_secret` Y el `code`

#### 3. Intercambiar grant_code → refresh_token

> [!warning] Este paso es OBLIGATORIO
> El `grant_code` NO funciona en producción. Solo dura 10 minutos y solo se puede canjear una vez. Tienes que cambiarlo por un `refresh_token` que es permanente.

Abre PowerShell o cmd y ejecuta:

```powershell
curl.exe -X POST "https://accounts.zoho.com/oauth/v2/token" `
  -d "grant_type=authorization_code" `
  -d "client_id=TU_CLIENT_ID" `
  -d "client_secret=TU_CLIENT_SECRET" `
  -d "code=EL_GRANT_CODE"
```

La respuesta es un JSON. Copia el campo **`refresh_token`** (largo, formato `1000.xxxx.yyyy`).

> [!tip] Si usas Postman
> URL: `POST https://accounts.zoho.com/oauth/v2/token`
> Body (x-www-form-urlencoded):
> - `grant_type` = `authorization_code`
> - `client_id` = *(tu client id)*
> - `client_secret` = *(tu client secret)*
> - `code` = *(el grant_code)*

### Variables de entorno en Vercel

Las 5 variables que hay que configurar en el proyecto `windmar-ai-agent` en Vercel:

| Variable | Valor |
|---|---|
| `ZOHO_CLIENT_ID` | *(del Self Client, formato `1000.XXXXX`)* |
| `ZOHO_CLIENT_SECRET` | *(del Self Client, hash hex)* |
| `ZOHO_REFRESH_TOKEN` | *(el del curl, NO el grant_code)* |
| `ZOHO_ORG_ID` | `699641359` |
| `ZOHO_API_DOMAIN` | `https://www.zohoapis.com` |

> Marca **Production · Preview · Development** en las 5.

Después de pegarlas: **Deployments → Redeploy** para que Vercel las tome.

---

## 🔌 Endpoints técnicos

| Endpoint | Qué hace |
|---|---|
| `GET /api/zoho/search?q=...` | Búsqueda inteligente. Devuelve `mode: 'single'\|'list'\|'none'` |
| `GET /api/zoho/client?q=...` | (deprecated, devuelve `{ found, lead, deals, summary }`) |
| `POST /api/zoho/coach` | Body con `ZohoClientFull` → genera sugerencias con Claude Haiku |

Todos protegidos por SSO de Microsoft — solo asesores `@windmarhome.com` pueden invocarlos.

---

## 🧪 Cómo probar que funciona

### Test 1 · DevTools Console (rápido)

```js
fetch('/api/zoho/search?q=test@example.com')
  .then(r => r.json().then(d => ({ status: r.status, body: d })))
  .then(console.log)
```

**Respuestas esperadas:**
- `200` con `{ mode: 'none', message: 'No se encontró...' }` → ✅ Zoho responde
- `200` con `{ mode: 'single', client: {...} }` → ✅✅ Match real
- `401` con error sobre refresh_token → ❌ Refresh inválido
- `503` → ❌ Variables no configuradas

### Test 2 · Desde el chat

Escribe en el input:
```
/zoho juan@windmarhome.com
```

### Errores comunes y solución

| Mensaje | Causa | Fix |
|---|---|---|
| "Zoho no está configurado" | Variables faltan en Vercel | Configurar las 5 vars + redeploy |
| "refresh_token es inválido o expiró" | Te dieron el grant_code en vez del refresh | Repetir paso 3 del setup (curl exchange) |
| "Client ID/Secret no coincide con refresh_token" | Mezclaste credenciales de dos Apps | Generar un Self Client nuevo desde 0 |
| "Respuesta de Zoho sin access_token" | Refresh revocado o credenciales mal | Regenerar Self Client |

---

## 🔐 Seguridad y rotación

> [!warning] Reglas importantes
> - Las credenciales **NUNCA** se commitean al repo (están en `.gitignore` por el `.env.local`)
> - Si las credenciales se exponen accidentalmente (Slack, chat, screenshot), **regenera el Client Secret** en Zoho inmediatamente
> - Cada rotación invalida las viejas y emite nuevas — el sistema queda fuera de servicio durante ~30s mientras actualizas Vercel

### Cómo rotar

1. `api-console.zoho.com` → tu Client → **Client Secret** → **🔄 Regenerate**
2. Genera un Self Client nuevo con los 3 scopes
3. Intercambia el grant por refresh (curl del paso 3)
4. Vercel → Settings → Environment Variables → actualiza las 3 vars
5. Redeploy

---

## 🔗 Conexiones

- 🎯 Comando que invoca esto: [[09 - Comandos slash]]
- ☀️ Coach IA que genera sugerencias: usa Claude Haiku
- 📧 Modal de correos donde se auto-completa: [[08 - Sistema de correos]]
- 🤝 App hermana que comparte tenant: NOTAS-VENTAS-VASS

[[00 🌞 MOC|← Volver al MOC]]
