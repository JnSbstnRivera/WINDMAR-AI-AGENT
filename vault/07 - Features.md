---
tags: [features, capabilities, producto]
fecha: 2026-05-26
---

# ✨ Features completas

> [!abstract] Todo lo que sabe hacer el agente hoy
> Lista exhaustiva de capacidades en producción. Cada feature enlaza a su nota detallada cuando aplica.

---

## 💬 Chat IA con RAG

El core del producto.

- Pregunta-respuesta con conocimiento curado (239 entradas en KB)
- **Streaming SSE** — primer token en ~500ms
- **Memoria conversacional** ("Ficha del cliente" implícita)
- **Quick replies** — chips de respuesta rápida bajo cada mensaje
- **Tool cards neón** — tarjetas clickeables con cotizadores
- **Regenerar** — botón ↺ para volver a generar la última respuesta
- **Feedback 👍/👎** — con razón opcional

Detalle técnico: [[03 - Flujo de pregunta]]

---

## 📄 Análisis de cualquier documento (visión IA)

Upload de imagen (JPG/PNG/WebP/GIF) o PDF — máximo 10MB.

**Comportamiento contextual:**

| Con mensaje del asesor | Sin mensaje |
|------------------------|-------------|
| Cumple la instrucción específica<br/>("dame los datos", "¿quién es el titular?") | Detecta tipo de documento automáticamente |

**Tipos detectados automáticamente:**

| Tipo | Qué extrae |
|------|------------|
| 📄 Factura LUMA | Cuenta, dirección, cobro del mes, consumo anual |
| 🪪 ID con foto | Nombre, fecha nacimiento, últimos 4 del número (privacidad) |
| 📋 Cotización/contrato | Cliente, fecha, productos (sin tocar precios) |
| 📑 Otro | Resumen + pregunta qué necesita extraer |

> [!warning] Privacidad
> El archivo **NO se guarda**. Pasa por memoria del request hacia Anthropic y se descarta. Los IDs nunca exponen el número completo.

Endpoint: `/api/upload-document`

---

## 📧 Sistema de correos

6 plantillas formales, firma corporativa automática, adjuntos PDF/JPG/PNG.

Detalle completo: [[08 - Sistema de correos]]

---

## 🎮 Comandos slash

Atajos rápidos en el input. Detalle: [[09 - Comandos slash]]

---

## 👾 Easter eggs y juegos

Snake, Pong, Invaders con tema Windmar. Detalle: [[10 - Easter eggs]]

---

## 📊 Dashboard administrativo

Métricas, KPIs, auditoría de conversaciones. Detalle: [[11 - Dashboard admin]]

---

## 🔍 Búsqueda en conversaciones

Buscador full-text en el sidebar.

- Debounce 300ms
- Busca en títulos Y contenido de mensajes (user + assistant)
- Resultados con preview de 2 líneas
- Click → navega a la conversación

Endpoint: `/api/conversations/search?q=...`

---

## 🎨 Tema dark/light con View Transitions

Toggle con animación **clip-path circular reveal** (View Transitions API).

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.5s;
}
```

- Persistencia en `localStorage` (`wh-theme`)
- Respeta `prefers-color-scheme` al primer login
- Mascota cambia de versión según tema

---

## 🐛 Coaching socrático

Cuando el asesor duda, el bot devuelve 2-3 preguntas para que las haga AL cliente, implementando SPIN selling.

Ver: [[05 - SYSTEM_PROMPT#6. Modo Socrático]]

---

## 🎯 Memoria de cliente

El bot recuerda datos del cliente mencionados en la conversación:
- Nombre
- Productos discutidos
- Datos de LUMA (si los compartió el asesor)
- Tipo de techo, edad, sqft

Esto le permite responder coherentemente sin pedir los mismos datos otra vez.

---

## 🔐 SSO Microsoft Entra

- Solo `@windmarhome.com`
- Auto-provisión de perfil en primer login
- Foto descargada de Microsoft Graph (`/me/photo`)
- Sesión 8 horas (auto-logout fin de turno)
- Refresh token para mantener `Mail.Send` vivo > 1h

Detalle: [[03 - Flujo de pregunta]]

---

## 👤 Onboarding

Modal de bienvenida en el primer login pregunta:
- Display name (puede ser apodo)
- Departamento
- Rol (Asesor / Líder / Channel / Project M)

Estos datos personalizan el tono y se guardan en `user_roles`.

---

## 🎭 Mascota viva — SUN BOT

Estados de la mascota animada:
- `idle` — normal con halo respirando
- `typing` — animación escribiendo cuando el asesor tipea
- `thinking` — cuando se procesa la respuesta
- `loading` — durante upload de archivos
- `happy` — en juegos como Snake
- `error` — cuando algo falla

Imágenes en `public/sunbot-*.png` (pixel art).

---

## 🗂️ Múltiples conversaciones

Sidebar con:
- Lista de conversaciones (más recientes arriba)
- **Nueva conversación** (botón naranja)
- **Borrar individual** (icono trash al hover)
- **Borrar todo el historial** (con confirmación double-click)
- **Buscador** (full-text)
- **Tip del día** rotativo cada 25s

---

## ✅ Auditoría completa

Todo queda registrado:
- Mensajes (user + assistant)
- Feedback (👍/👎 con razón)
- Conversaciones (incluso las borradas — soft delete con `deleted_at`)
- Correos enviados (vía Microsoft Graph)
- Login events (vía NextAuth)

Visible en el [[11 - Dashboard admin]].

---

## Conexiones

- 🧠 Cómo se controla el comportamiento: [[05 - SYSTEM_PROMPT]]
- 🛣️ Features que vienen: [[16 - Roadmap]]

[[00 🌞 MOC|← Volver al MOC]]
