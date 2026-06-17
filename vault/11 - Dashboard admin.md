---
tags: [dashboard, admin, métricas, analytics]
fecha: 2026-06-17
---

# 📊 Dashboard administrativo

> [!info] Acceso restringido
> Ruta: `/admin` · Solo emails en `ADMIN_EMAILS` (variable de entorno). Verificación en cada request.

---

## 🧭 Menú desplegable (`AdminNav`)

> [!success] Junio 2026 — el topbar se simplificó
> Las **8 opciones** del admin (dashboard / gestión / asignar / auditoría / usuarios / Zoho config / Zoho salud / etc.) ahora viven en un **menú desplegable** (`AdminNav`) en vez de una fila de tabs.

- El **ítem activo** se resalta y muestra un **badge de pendientes** (ej. usuarios por aprobar).
- El logo **SUN BOT** + el **reloj** + el **toggle de tema** se quedan fijos en la barra.

Componente: `src/components/admin/AdminNav.tsx`.

---

## Vista general

```
┌─────────────────────────────────────────────────┐
│ [Today] [7 días] [30 días] [Todo]   [ACT 14:23] │   ← Filtros + última actualización
├─────────────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                 │
│ │Msg  │ │Aseso│ │Conv │ │Sat  │                 │   ← KPI cards (naranja neón)
│ │ 254 │ │  12 │ │  18 │ │ 75% │                 │
│ └─────┘ └─────┘ └─────┘ └─────┘                 │
├─────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐               │
│ │ Mensajes/día │ │ Calidad      │               │   ← Line chart + Donut
│ └──────────────┘ └──────────────┘               │
├─────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐               │
│ │ Por depto    │ │ Hora pico    │               │   ← Bar + Heatmap
│ └──────────────┘ └──────────────┘               │
├─────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐               │
│ │ Top asesores │ │ Downvotes    │               │   ← Tablas
│ └──────────────┘ └──────────────┘               │
├─────────────────────────────────────────────────┤
│ Conversaciones recientes (auditoría completa)   │
└─────────────────────────────────────────────────┘
```

---

## Componentes y métricas

### 🟧 KPI Cards (4)

| KPI | RPC origen |
|-----|-----------|
| Total mensajes | `admin_metrics_kpis` |
| Asesores activos | `admin_metrics_kpis` |
| Conversaciones iniciadas | `admin_metrics_kpis` |
| % Satisfacción (👍/(👍+👎)) | `admin_metrics_kpis` |

Variantes 1-4 con color slot distinto (naranja, púrpura, cyan, verde).

### 📈 Mensajes por tiempo

`admin_usage_by_day(period)`:
- `today` → por hora (24 puntos)
- `week` → por día (7)
- `month` → por día (30)
- `all` → **por mes**, solo meses activos (no muestra 11 meses en cero)

### 🍩 Quality donut

Distribución 👍 vs 👎 de toda la data del periodo. Si no hay votos, muestra estado vacío.

### 🏢 Mensajes por departamento

Bar chart con departamentos del `user_roles.departamento`. Top 8.

### 🕒 Hora pico

`admin_usage_by_hour(period)` → 24 buckets de 0-23h (hora PR, UTC-4). Muestra cuándo se usa más el bot.

### 🏆 Top asesores

Ranking de los 7 más activos. Columnas: avatar · nombre · depto · mensajes · convs.

### 👎 Downvotes recientes

Tabla con mensajes que recibieron 👎:
- Asesor que votó
- Excerpt del mensaje (200 chars)
- Razón (si la dio)
- Fecha

**Este es el feedback más valioso** — muestra dónde el bot está fallando.

### 💬 Conversaciones recientes

Auditoría completa:
- Avatar + nombre asesor + departamento
- Título de la conversación
- Primera línea del primer mensaje user
- Última actividad
- Total mensajes
- Estado (activa / eliminada)
- Link "Ver detalle" (no implementado aún, pendiente)

---

## Filtros

### Período (filtro maestro)

```
[Hoy] [7 días] [30 días] [Todo]
```

> [!important] El filtro aplica a TODO
> Tanto los KPIs como las gráficas y las tablas usan el mismo `period`. Si filtras "Hoy", las conversaciones de abajo también son solo de hoy.

### Auto-refresh

Cada **60 segundos** se refrescan todos los datos automáticamente. Indicador `ACT HH:MM:SS` muestra la última actualización.

Botón **↻ Refresh** para forzar actualización inmediata.

---

## Animaciones

Cada sección tiene `key={period}` que fuerza **re-mount** al cambiar el filtro → dispara animación `.ad-anim-in` con delays cascada:

```css
.admin-root .ad-anim-in    { animation: adSlideUp 0.55s ...; }
.admin-root .ad-anim-d1    { animation-delay: 0.08s; }
.admin-root .ad-anim-d2    { animation-delay: 0.16s; }
.admin-root .ad-anim-d3    { animation-delay: 0.24s; }
.admin-root .ad-anim-d4    { animation-delay: 0.32s; }
```

Resultado: al cambiar de "Hoy" a "Semana", todas las secciones aparecen escalonadas con un efecto bounce sutil.

---

## Tema Executive 2026 (neón)

El dashboard tiene un theme propio (`admin-theme.css`) que se sobrescribe sobre el light/dark global:

- Fondo navy oscuro con gradientes
- KPI cards con border naranja brillante (variante por slot)
- Gráficas con grid lines tenues
- Tooltips dark con bordes neón
- Mono font para números (`JetBrains Mono`)

---

## Endpoint `/api/admin/metrics`

```typescript
GET /api/admin/metrics?period=week

// Devuelve TODO de una vez (single fetch):
{
  kpis: { totalMessages, activeUsers, totalConvs, thumbsUp, thumbsDown, satisfactionPct },
  usage: UsageDay[],
  topAsesores: AsesorRow[],
  downvotes: DownvoteRow[],
  conversations: ConvRow[],
  departments: DeptRow[],
  hourly: HourRow[]
}
```

Cada llamada hace 7 RPCs en paralelo (`Promise.all`). Latencia típica: ~300ms.

---

## Componentes y dónde viven

| Componente | Archivo |
|------------|---------|
| `AdminDashboard` (orquestador) | `src/components/admin/AdminDashboard.tsx` |
| `MetricCard` (KPIs) | `src/components/admin/MetricCard.tsx` |
| `UsageChart` (line) | `src/components/admin/UsageChart.tsx` |
| `QualityDonut` (pie) | `src/components/admin/QualityDonut.tsx` |
| `DepartmentChart` (bar) | `src/components/admin/DepartmentChart.tsx` |
| `HourlyChart` (heatmap) | `src/components/admin/HourlyChart.tsx` |
| `TopAsesoresTable` | `src/components/admin/TopAsesoresTable.tsx` |
| `DownvotesTable` | `src/components/admin/DownvotesTable.tsx` |
| `ConversationsList` | `src/components/admin/ConversationsList.tsx` |

---

## Decisiones de diseño

> [!tip] Removidos del dashboard (pero conservados en código)
> - `TopKeywords` — palabras más usadas (no aportaba)
> - `WeekComparison` — comparativa semana actual vs anterior (no se entendía bien)
>
> Los componentes y RPCs siguen en el repo por si los reactivamos.

---

## 🤝 Salud de Zoho — consultas por asesor y por día (`/admin/zoho`)

> [!info] Junio 2026 — telemetría del agente Zoho
> La pestaña **Salud** de `/admin/zoho` muestra cómo se usa el agente Zoho, no solo si está vivo.

- **Consultas por asesor** — bar chart por usuario: **llamadas**, **promedio ms** y **errores**.
- **Consultas por día** — gráfica de volumen de consultas a Zoho en el tiempo.
- Latencia p50/p95, % error y consultas por herramienta (sobre la tabla `zoho_query_log`).

RPC: `admin_zoho_health` ahora devuelve `byUser` (desglose por asesor) además de los agregados.

Junto a Salud, `/admin/zoho` sigue teniendo la **config editable** (mapeos de estados/stages + **plantillas de tipificación por estado** `zoho_tipificar_opciones`). Ver [[07 - Features#🤝 Zoho CRM — consulta + gestión autónoma]].

---

## 📅 Filtro de fecha de cita en `/admin/asignar`

> [!tip] Asignar leads por fecha de cita (`Presenter_Appointment`)
> Nuevo filtro en la pantalla de asignación: **Todas / Hoy / Futuras / fecha específica**.

Caso de uso real (líder de Telemercadeo, **Jesús**): filtrar **Cita Coordinada + owner + cita de hoy** para repartir solo los leads con cita del día.

---

## Conexiones

- 🗄️ Las funciones SQL: [[04 - Esquema Supabase#Funciones RPC]]
- 👎 Cómo se generan los downvotes: [[03 - Flujo de pregunta#Paso 10 — Feedback opcional]]
- 🧠 Lo que el dashboard ayuda a mejorar: [[05 - SYSTEM_PROMPT]]
- 🤝 El agente que la salud de Zoho monitorea: [[07 - Features#🤝 Zoho CRM — consulta + gestión autónoma]]

[[00 🌞 MOC|← Volver al MOC]]
