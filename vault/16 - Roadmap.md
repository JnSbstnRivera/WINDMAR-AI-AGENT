---
tags: [roadmap, futuro, ideas, planning]
fecha: 2026-05-26
estado: planificación
---

# 🛣️ Roadmap futuro

> [!info] Vivo y cambiante
> Esta lista refleja las ideas en cola al 2026-05-26. Se actualiza conforme los asesores van pidiendo cosas y vemos qué funciona en producción.

---

## 🔴 Prioridad alta

### 🌍 Replicar para Florida
**Estado:** Documentación lista (`GUIA-MAESTRA-REPLICACION-WINMARD-AGENT-AI.md` en raíz del repo). Pendiente que el colega de Florida arranque.

Cada área tendrá su **propio chat** con:
- Su propio knowledge base
- Sus propias herramientas (si Florida tiene cotizadores distintos)
- Su dominio SSO (`@windmarfl.com` o similar)
- Su tono y reglas de negocio

> Ver: el archivo `GUIA-MAESTRA-REPLICACION-WINMARD-AGENT-AI.md` (auto-contenido para que el Claude del colega lo lea siguiendo AI-DLC).

### 📨 Tracking de respuestas a correos
**Estado:** Planeado.

Microsoft Graph permite escuchar el inbox del asesor vía webhooks. Cuando el cliente responde al correo de seguimiento, marcar la conversación con un badge "📩 Respondió".

### 🔔 Notificaciones push
**Estado:** Diseño pendiente.

Cuando el cliente responda un correo o cuando un asesor reciba un mensaje (futuro: chat asíncrono), enviar push al navegador. Service Worker + Web Push API.

---

## 🟡 Prioridad media

### 🎯 Predicción de cierre
**Estado:** Ideación.

Modelo ML simple que analice patrones en conversaciones cerradas exitosas vs no, y prediga la probabilidad de cierre por cada conversación activa. Inputs:
- Largo de la conversación
- Mensajes de objeción detectados
- Tools recomendadas
- Tiempo en cada etapa

### 🤖 Auto-tagging de conversaciones
**Estado:** Spec borrador.

Después de cada conversación, llamar a Claude con el historial y pedirle tags:
- `cierre-en-primera-llamada`
- `objeción-precio-resuelta`
- `cliente-pidió-tiempo`
- `requiere-visita-técnica`

Útil para filtros en el dashboard y para entrenar el modelo si algún día hacemos fine-tuning.

### 📱 PWA instalable
**Estado:** Add manifest.json + service worker básico.

Para que el asesor pueda "instalar" el agente en su celular como app nativa. Útil si trabajan en campo.

### 🎙️ Modo dictado mejorado
**Estado:** Pausado por sensibilidad de privacidad.

Web Speech API podría permitir dictar la pregunta sin teclear. Pausado porque:
- Privacidad: el micrófono captaría también la voz del cliente
- Precisión: español PR vs español neutro no siempre se transcribe bien

Posible reactivación si encontramos un STT que respete privacidad (on-device).

---

## 🟢 Prioridad baja / nice-to-have

### 🎨 Más temas visuales
Actualmente: light, dark. Considerados:
- Vintage (sepia, papel, tipografía serif)
- Hacker (verde fosforescente en negro)
- Festivos (navidad, año nuevo, día de Puerto Rico)

### 🎮 Más juegos
- Tetris solar (piezas de placas)
- Memory game (pares de productos Windmar)
- Quiz de conocimiento del bot (gamificación del KB)

### 📊 Reportes automáticos por correo
Vercel Cron + plantilla → envío semanal a admins con métricas resumidas.

### 🔍 Vector search con pgvector
Cuando el KB supere 500 entradas, migrar de ILIKE a embeddings reales.

### 🌐 Multi-idioma
El bot detecta inglés y responde en inglés. Útil si Windmar Florida o expansión a clientes hispanos en US continental.

---

## 🧊 En el congelador (no ahora)

### ❌ Chat asíncrono entre asesores
Slack-like dentro de la app. Decidimos NO porque Teams ya lo hace.

### ❌ App nativa iOS/Android
Costo/beneficio no cierra. PWA es suficiente.

### ❌ Versión pública para clientes finales
Riesgo de info filtrada + REGLA SUPREMA. Por ahora solo interna.

---

## Cómo proponer una idea

> [!tip] Proceso
> 1. Pregúntate: ¿es algo que el asesor pidió o algo que YO creo que necesita?
> 2. Si es del asesor → captura el caso de uso real
> 3. Si es tuyo → busca confirmación de 3+ asesores antes de buildear
> 4. Documenta el "qué" y el "por qué" en esta nota
> 5. Asigna prioridad

> [!quote] Anti-pattern a evitar
> *"Sería cool tener X"* — sin caso de uso real, no se construye.

---

## Decisiones que cambiaron el roadmap

> [!info] Histórico
> - **Mar 2026** — Migración de Groq/Llama a Claude Haiku 4.5 (calidad)
> - **Abr 2026** — REGLA SUPREMA codificada en el SYSTEM_PROMPT después de un incidente
> - **May 2026** — Sistema de correos vía Microsoft Graph (no SendGrid)
> - **May 2026** — Vault Obsidian creado para documentación viva
> - **May 2026** — Guía de replicación AI-DLC para Florida

---

## Conexiones

- 🎯 Cuál es la visión que guía el roadmap: [[01 - Visión y propósito]]
- 🧰 Decisiones técnicas previas: [[15 - Decisiones técnicas]]

[[00 🌞 MOC|← Volver al MOC]]
