# 🗺️ Roadmap Visual — WINDMAR AI AGENT

> Mapa conceptual del proyecto. **Última actualización: 30 abril 2026**
> Progreso global: **82% hacia v1.0 producción** ⬆️ (+7% hoy)

---

## 🌟 Vista General (Mind Map)

```mermaid
mindmap
  root((WINDMAR<br/>AI AGENT))
    ✅ Infraestructura
      Auth Supabase
      Backend Vercel
      Streaming
      Deploy automático
    ✅ Conocimiento
      206 entradas
      9 categorías
      Búsqueda OR
      10 herramientas
    ✅ Inteligencia
      Prompt adaptativo
      4 tipos de mensaje
      Memoria conversacional
      Tono adaptado por rol
      Detección de errores
    ✅ UX/UI
      Modo oscuro/claro
      SUN BOT 6 estados
      Glassmorphism
      Responsive
      Welcome con glowmorphism
    ✅ Auth Avanzado
      Flip card 3D
      Registro completo
      Recuperar contraseña
      Detección email duplicado
      Términos de uso
    ✅ Perfil de Usuario
      ProfileModal editable
      display_name personalizable
      Departamento + Rol
      Engranaje en TopBar
    🔄 Validación
      Pilotaje 3-5 asesores
      Dashboard Groq
      Feedback real
      Ajuste de prompt
    ⏳ Optimización
      Migrar a Claude
      Botones 👍👎
      Métricas Supabase
    🔮 Futuro
      Zoho CRM
      Citas automáticas
      Reportes semanales
```

---

## 🚦 Estado por Bloques

```mermaid
flowchart TD
    Start([🚀 Inicio Proyecto]) --> A
    A[🟢 BLOQUE A<br/>Infraestructura<br/>100% ✅]
    A --> B[🟢 BLOQUE B<br/>Conocimiento<br/>100% ✅]
    B --> C[🟢 BLOQUE C<br/>Prompt IA<br/>100% ✅]
    C --> D[🟢 BLOQUE D<br/>UX/UI<br/>100% ✅]
    D --> H[🟢 BLOQUE H<br/>Auth + Perfil<br/>100% ✅]
    H --> E{🟡 BLOQUE E<br/>Validación<br/>40% 🔄}
    E -->|Feedback OK| F[⏳ BLOQUE F<br/>Optimización<br/>0%]
    F --> V1([🎯 v1.0 PRODUCCIÓN])
    V1 --> G[🔮 BLOQUE G<br/>Integraciones<br/>Backlog]

    style A fill:#22c55e,color:#fff
    style B fill:#22c55e,color:#fff
    style C fill:#22c55e,color:#fff
    style D fill:#22c55e,color:#fff
    style H fill:#22c55e,color:#fff
    style E fill:#fbbf24,color:#000
    style F fill:#94a3b8,color:#fff
    style G fill:#a78bfa,color:#fff
    style V1 fill:#f97316,color:#fff
    style Start fill:#1B3A5C,color:#fff
```

---

## 📊 Detalle por Bloque

### 🟢 BLOQUE A — Infraestructura (✅ 100%)

```mermaid
flowchart LR
    A1[Auth Supabase] --> A2[Sesión persistente]
    A2 --> A3[Backend Vercel]
    A3 --> A4[Streaming responses]
    A4 --> A5[RLS por asesor]
    A5 --> A6[Deploy automático]

    style A1 fill:#22c55e,color:#fff
    style A2 fill:#22c55e,color:#fff
    style A3 fill:#22c55e,color:#fff
    style A4 fill:#22c55e,color:#fff
    style A5 fill:#22c55e,color:#fff
    style A6 fill:#22c55e,color:#fff
```

### 🟢 BLOQUE B — Conocimiento (✅ 100%)

```mermaid
flowchart TD
    KB[(📚 Knowledge Base<br/>206 entradas)]
    KB --> B1[☀️ Solar]
    KB --> B2[🔋 Anker]
    KB --> B3[💧 Water]
    KB --> B4[🏠 Roofing]
    KB --> B5[💰 Financiamiento]
    KB --> B6[🛡️ Garantías]
    KB --> B7[⚙️ Procesos]
    KB --> B8[💬 Objeciones]
    KB --> B9[🔧 10 Herramientas]

    style KB fill:#F7941D,color:#fff
```

### 🟢 BLOQUE C — Prompt Adaptativo (✅ 100%)

```mermaid
flowchart TD
    User[👤 Asesor pregunta]
    User --> Detect{🧠 Detecta tipo<br/>de mensaje}
    Detect -->|Saludo| T1[💚 Tipo 1<br/>Respuesta corta]
    Detect -->|Casual| T2[💚 Tipo 2<br/>Conversacional]
    Detect -->|Follow-up| T3[💚 Tipo 3<br/>Continúa hilo]
    Detect -->|Sustantiva| T4[🔴 Tipo 4<br/>Formato Mentor]
    T1 --> Role{👔 Rol del usuario}
    T2 --> Role
    T3 --> Role
    T4 --> Role
    Role -->|Asesor| Out([📤 Tono normal])
    Role -->|Jefe| OutJ([📤 Tono ejecutivo])
    Role -->|Channel| OutC([📤 Tono partner])

    style Detect fill:#fbbf24,color:#000
    style T4 fill:#1B3A5C,color:#fff
    style Role fill:#a78bfa,color:#fff
    style Out fill:#F7941D,color:#fff
    style OutJ fill:#F7941D,color:#fff
    style OutC fill:#F7941D,color:#fff
```

### 🟢 BLOQUE D — UX/UI (✅ 100%)

```mermaid
flowchart LR
    UI[🎨 UI Windmar]
    UI --> D1[🌙 Dark/Light]
    UI --> D2[🤖 SUN BOT 6 estados]
    UI --> D3[💬 Burbujas + avatares]
    UI --> D4[📱 Responsive]
    UI --> D5[✨ Glassmorphism]
    UI --> D6[💡 Tips rotativos]
    UI --> D7[🌟 Welcome glowmorphism]

    D2 --> S1[idle]
    D2 --> S2[typing]
    D2 --> S3[thinking]
    D2 --> S4[happy]
    D2 --> S5[error]
    D2 --> S6[loading]

    style UI fill:#1B3A5C,color:#fff
```

### 🟢 BLOQUE H — Auth + Perfil (✅ 100%) 🆕

```mermaid
flowchart TD
    Auth[🔐 Sistema Auth]
    Auth --> Login[🚪 Login]
    Auth --> Register[📝 Registro]
    Auth --> Forgot[🔑 Recuperar]

    Login --> Flip[🎴 Flip Card 3D]
    Register --> Flip
    Flip --> Fields[📋 Campos:<br/>nombre, depto, rol,<br/>contraseña x2, T&C]
    Fields --> Validate{✅ Valida}
    Validate -->|OK| Confirm[✨ Modal confirmación]
    Validate -->|Email duplicado| Red[❌ Banner rojo]
    Confirm --> Save[💾 user_metadata]

    Save --> Profile[👤 ProfileModal]
    Profile --> Edit[✏️ Editar nombre/<br/>depto/rol]
    Edit --> Sync[🔄 Refresca app]

    style Auth fill:#1B3A5C,color:#fff
    style Flip fill:#F7941D,color:#fff
    style Confirm fill:#22c55e,color:#fff
    style Red fill:#ef4444,color:#fff
    style Profile fill:#a78bfa,color:#fff
```

### 🟡 BLOQUE E — Validación (🔄 EN CURSO)

```mermaid
flowchart TD
    E[📍 ESTAMOS AQUÍ]
    E --> E1[👥 Pilotaje<br/>3-5 asesores]
    E1 --> E2[📊 Monitor<br/>Dashboard Groq]
    E2 --> E3[📝 Feedback<br/>cualitativo]
    E3 --> E4{¿Respuestas<br/>buenas?}
    E4 -->|Sí| E5[✅ Aprobación<br/>gerencia]
    E4 -->|No| E6[🔧 Ajustar<br/>prompt + KB]
    E6 --> E1
    E5 --> Next([➡️ Bloque F])

    style E fill:#fbbf24,color:#000
    style Next fill:#22c55e,color:#fff
```

### ⏳ BLOQUE F — Optimización (próximo)

```mermaid
flowchart LR
    F1[🤖 Migrar<br/>a Claude API]
    F2[👍👎 Botones<br/>feedback]
    F3[📈 Tabla<br/>métricas]
    F4[👨‍💼 Dashboard<br/>admin]

    F1 --> F2
    F2 --> F3
    F3 --> F4

    style F1 fill:#a78bfa,color:#fff
    style F2 fill:#a78bfa,color:#fff
    style F3 fill:#94a3b8,color:#fff
    style F4 fill:#94a3b8,color:#fff
```

### 🔮 BLOQUE G — Integraciones Futuras

```mermaid
flowchart TD
    Future[🔮 Fase 2 del proyecto]
    Future --> G1[💼 Zoho CRM<br/>Deal # → Producto]
    Future --> G2[📅 Citas automáticas]
    Future --> G3[📊 Reportes semanales]
    Future --> G4[🔔 Notificaciones push]
    Future --> G5[🌐 Multi-idioma]

    style Future fill:#a78bfa,color:#fff
```

---

## 🛣️ Línea de Tiempo

```mermaid
gantt
    title Ruta hacia v1.0 Producción
    dateFormat YYYY-MM-DD
    axisFormat %d %b

    section Fase 1-3 (Hecho)
    Infraestructura      :done,    a1, 2026-03-01, 7d
    Knowledge Base       :done,    b1, 2026-03-08, 14d
    Prompt + UI          :done,    c1, 2026-03-22, 21d
    Auth + Perfil 🆕     :done,    h1, 2026-04-29, 2d

    section Fase 4 (Ahora)
    Pilotaje asesores    :active,  e1, 2026-05-01, 14d
    Recolectar feedback  :active,  e2, 2026-05-01, 14d

    section Fase 5 (Próximo)
    Migrar a Claude API  :         f1, 2026-05-15, 3d
    Botones feedback     :         f2, 2026-05-18, 3d
    Demo gerencia        :         f3, 2026-05-21, 2d

    section Lanzamiento
    🎯 v1.0 Producción   :crit,    v1, 2026-05-23, 1d
```

---

## 🎯 Prioridades Esta Semana

```mermaid
quadrantChart
    title Importancia vs Urgencia
    x-axis Bajo Esfuerzo --> Alto Esfuerzo
    y-axis Bajo Impacto --> Alto Impacto
    quadrant-1 Hacer Ya
    quadrant-2 Planificar
    quadrant-3 Delegar
    quadrant-4 Ignorar

    Pilotaje asesores: [0.2, 0.95]
    Monitor Groq dashboard: [0.1, 0.7]
    Feedback informal: [0.15, 0.85]
    Migrar Claude: [0.5, 0.8]
    Botones 👍👎: [0.4, 0.5]
    Zoho CRM: [0.9, 0.6]
    Multi-idioma: [0.6, 0.2]
```

---

## 🚦 Semáforo de Riesgos

```mermaid
flowchart LR
    R1[🟠 Rate limit Groq<br/>30 RPM free] -->|Mitigación| M1[Migrar a Claude<br/>o pagar Groq]
    R2[🟢 KB incompleto] -->|Mitigación| M2[Asesores reportan<br/>qué falta]
    R3[🟡 Adopción baja] -->|Mitigación| M3[Demo + onboarding]
    R4[🟡 Info desactualizada] -->|Mitigación| M4[Update trimestral]
    R5[🟢 Costo API] -->|Mitigación| M5[Claude $3/M tokens]

    style R1 fill:#f97316,color:#fff
    style R2 fill:#22c55e,color:#fff
    style R3 fill:#fbbf24,color:#000
    style R4 fill:#fbbf24,color:#000
    style R5 fill:#22c55e,color:#fff
```

---

## 📅 Bitácora de Cambios

### 30 abril 2026 — Auth avanzado + perfil de usuario 🆕

**Login/Registro completamente rediseñado:**
- Tarjeta con animación 3D flip (eje Y, 0.7s premium curve)
- Cara frontal: login + "¿Olvidaste contraseña?" + logo decorativo con partículas
- Cara trasera: registro con campos completos (nombre amigable, depto, rol, contraseñas, T&C)
- Grid stacking para auto-altura sin scroll en cualquier viewport
- Detección de email duplicado con banner rojo + icono
- Modal de confirmación del nombre antes de crear cuenta
- T&C con modal expandible (versionado v1.0 — Abril 2026)
- Recuperar contraseña con email reset

**Sistema de perfil:**
- ProfileModal con campos editables (nombre, depto, rol)
- Engranaje ⚙️ en TopBar abre el modal
- Datos persisten en `user_metadata` de Supabase
- Refetch automático después de guardar

**Personalización del bot:**
- Bot saluda con `display_name` (no más "juan.s", ahora "Don Pepe")
- Sidebar muestra nombre + departamento · rol
- Tono del bot adaptado por rol:
  - **Asesor** → tono normal
  - **Jefe** → "para tu equipo...", "puedes comunicar a tus asesores..."
  - **Channel** → "para tu canal...", "tus distribuidores..."

**UI polish:**
- Welcome screen con logo grande +80px y glow blanco
- Welcome shifted hacia arriba (justify-start + pt-vh)
- Logo decorativo con brillo blanco + partículas amarillas (login + welcome)
- SUN BOT mascota reposicionado al lado del input

**Commits del día**: 12 commits, ~1,200 líneas de código nuevas/modificadas

---

## 📍 ¿Cómo ver este mapa?

### Opción 1 — GitHub (más fácil) ✨
1. Ya está en tu repo: `ROADMAP.md`
2. Abre el archivo en GitHub web
3. Los diagramas se renderizan **automáticamente**
4. Link directo: `https://github.com/JnSbstnRivera/WINDMAR-AI-AGENT/blob/main/ROADMAP.md`

### Opción 2 — Mermaid Live Editor
1. Ve a https://mermaid.live
2. Copia/pega cualquier bloque ` ```mermaid ` de este archivo
3. Lo ves en tiempo real, lo descargas como PNG/SVG

### Opción 3 — VS Code
1. Instala extensión "Markdown Preview Mermaid Support"
2. Abre `ROADMAP.md`
3. `Ctrl+Shift+V` para preview

### Opción 4 — Notion
1. Crea página nueva
2. `/code` → selecciona "mermaid"
3. Pega el bloque que quieras

---

## 🔄 Cómo actualizar este mapa

Cuando completes algo:
1. Cambia `🔄` por `✅`
2. Cambia colores `fbbf24` (amarillo) por `22c55e` (verde)
3. Mueve la flecha de "📍 ESTAMOS AQUÍ" al siguiente bloque
4. Push a GitHub → mapa actualizado para todos

---

**Última actualización**: 30 abril 2026
**Próxima revisión sugerida**: 7 mayo 2026 (después de 1 semana de pilotaje)
