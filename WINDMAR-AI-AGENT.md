---
tags: [ai, panel-conectado, windmar, privado]
aliases: [AI Agent, Sun Bot, Asistente IA]
url: https://windmar-ai-agent.vercel.app
repo: https://github.com/JnSbstnRivera/WINDMAR-AI-AGENT
stack: [nextjs-15, react-19, typescript, nextauth-v5, microsoft-entra, anthropic-claude-haiku-4.5, supabase, microsoft-graph, pwa]
estado: activo
importancia: 5
hub_padre: PANEL-DE-HERRAMIENTAS-CALL-CENTER
visibilidad: privado
---

# 🤖 Windmar AI Agent (Sun Bot)

> [!tip] Esta es la **nota interna del repo** (resumen)
> Para la documentación COMPLETA del agente (~600 líneas con arquitectura, diagramas Mermaid, SYSTEM_PROMPT, easter eggs, etc.) ver: [[WINDMAR-AI-AGENT|nota maestra en root del vault]].

## 🎯 Qué hace

**Asistente IA conversacional** para el Call Center — responde preguntas técnicas, consulta knowledge base, ayuda a los agentes con casos complejos. Aparece como botón flotante en el Panel.

## 🔗 Conexiones

- ⬆️ Botón flotante en: [[PANEL-DE-HERRAMIENTAS-CALL-CENTER]]
- 🤝 Comparte API key (Anthropic) con: [[LUMA-SCANNER]]
- 🗄️ DB compartida: Supabase con [[WINDMAR-QA-CALLS]] (schemas separados)
- 🤝 Hermanas AI-DLC: [[WINDMAR-VASS-INBOX]] · [[WINDMAR-QA-CALLS]] · [[WINDMAR-TIME]]

## 🛠️ Stack

- **Next.js 15** + React 19 + TypeScript
- **NextAuth v5** + **Microsoft Entra ID** (SSO Windmar — activo en producción)
- **Supabase** (conversations, messages, knowledge_base, user_roles, feedback)
- **Claude Haiku 4.5** con prompt caching (TTL 5 min)
- **Microsoft Graph API** para enviar correos desde el Outlook del asesor
- **PWA instalable** (manifest + service worker) — icono SUN BOT feliz
- Tailwind CSS v4

## 📊 Estado

- ✅ Deploy en main → READY · `windmar-ai-agent.vercel.app`
- ✅ SSO Microsoft Entra ID **activo**
- ✅ 239 entradas knowledge base · 29 herramientas integradas
- ✅ Sistema de correos con 6 plantillas + Microsoft Graph
- ✅ Análisis de cualquier documento (visión IA)
- ✅ Dashboard admin con métricas (`/admin`)
- ✅ **PWA instalable en Windows/iOS** — escritorio + barra de tareas, ventana propia
- 🔒 Repo privado · LICENSE Windmar

## 🔙

[[00 🌞 MAPA MAESTRO]] · [[PANEL-DE-HERRAMIENTAS-CALL-CENTER]] · [[WINDMAR-AI-AGENT|📖 Nota maestra completa]]
