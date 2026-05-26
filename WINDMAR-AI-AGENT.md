---
tags: [ai, panel-conectado, windmar, privado]
aliases: [AI Agent, Sun Bot, Asistente IA]
url: https://windmar-ai-agent.vercel.app
repo: https://github.com/JnSbstnRivera/WINDMAR-AI-AGENT
stack: [nextjs, react, typescript, nextauth, microsoft-entra, groq, supabase]
estado: activo
importancia: 5
hub_padre: PANEL-DE-HERRAMIENTAS-CALL-CENTER
visibilidad: privado
---

# 🤖 Windmar AI Agent (Sun Bot)

## 🎯 Qué hace

**Asistente IA conversacional** para el Call Center — responde preguntas técnicas, consulta knowledge base, ayuda a los agentes con casos complejos. Aparece como botón flotante en el Panel.

## 🔗 Conexiones

- ⬆️ Botón flotante en: [[PANEL-DE-HERRAMIENTAS-CALL-CENTER]]
- 🤝 Comparte API key (Anthropic) con: [[LUMA-SCANNER]]
- 🗄️ DB compartida: Supabase (mismo schema con conversations, messages, knowledge_base, user_roles)

## 🛠️ Stack

- **Next.js 15** + React 19 + TypeScript
- **NextAuth v5** + **Microsoft Entra ID** (SSO Windmar)
- **Supabase** (conversations, messages, knowledge_base, user_roles)
- **Groq** (`llama-3.3-70b-versatile`)
- Tailwind CSS v4

## ⏸️ Pendiente

> [!warning] Bloqueado por IT
> Migración completa al stack nuevo está lista. Solo pendiente:
> - `AUTH_MICROSOFT_ENTRA_ID_ID` (Application Client ID)
> - `AUTH_MICROSOFT_ENTRA_ID_SECRET`
> - `AUTH_MICROSOFT_ENTRA_ID_ISSUER` (Tenant ID)

## 📊 Estado

- ✅ Deploy en main → READY
- 🔒 Repo privado
- ✅ LICENSE Windmar aplicada
- ⏸️ SSO pendiente de credenciales Azure

## 🔙

[[00 🌞 MAPA MAESTRO]] · [[PANEL-DE-HERRAMIENTAS-CALL-CENTER]]
