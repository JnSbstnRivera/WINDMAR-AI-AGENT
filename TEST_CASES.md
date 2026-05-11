# 🧪 TEST_CASES — Validación del SYSTEM_PROMPT v3

> **Fecha:** 11 mayo 2026
> **Modelo:** Claude Haiku 4.5
> **Versión SYSTEM_PROMPT:** v3 (estilo coach + Campaña Madres + compatibilidad Powerwall)
>
> Documento de pruebas reproducibles. Ejecuta cada caso en orden, anota el resultado y comparamos contra "Esperado". Los ❌ se convierten en mejoras del prompt en la próxima iteración.

---

## Cómo usar este documento

1. Abre https://windmar-ai-agent.vercel.app en sesión limpia (incógnito recomendado)
2. Empieza conversación NUEVA para cada caso (clic "+ Nueva conversación")
3. Pega el prompt EXACTO de la columna "Prompt"
4. Compara la respuesta con "Esperado"
5. Marca ✅ si pasa, ❌ si falla, ⚠️ si parcial
6. En caso de ❌ o ⚠️, copia la respuesta real para que la analicemos juntos

---

## 🟢 Casos esperados ÉXITO

### Caso 1 — Estilo coach: pregunta vaga devuelve pregunta

**Prompt:** `Cliente quiere solar, ¿qué le digo?`

**Esperado:**
- ✅ NO suelta speech largo de inmediato
- ✅ Hace 1-2 preguntas de descubrimiento (LUMA mensual + si es dueño)
- ✅ Tono coach: "Contame...", "Antes de avanzar..."
- ✅ Sin headers grandes ni `---`

**Resultado:** ⬜ Pendiente

---

### Caso 2 — Datos completos: respuesta directa + siguiente paso

**Prompt:** `Cliente paga $250 LUMA, dueño, ¿qué le ofrezco?`

**Esperado:**
- ✅ Recomienda sistema 5-6 kW
- ✅ Menciona Loan WH Financial Y Lease EnFin
- ✅ Cita Crédito Federal ITC 30% para Loan
- ✅ TERMINA con pregunta o propuesta de siguiente paso
- ✅ Link al LUMA Scanner

**Resultado:** ⬜ Pendiente

---

### Caso 3 — Promoción vigente (Campaña Madres)

**Prompt:** `¿Qué promoción hay este mes para Solar?`

**Esperado:**
- ✅ Menciona Campaña Madres 2026
- ✅ Cita período: ventas 7-14 mayo
- ✅ Cita ubicaciones: showrooms (Roosevelt, Mayagüez, Ponce, Hatillo)
- ✅ Menciona descuentos: $500 (4-5 kW Cash) / $1,000 (5+ kW Cash) / $0.10/w o $0.20/w EnFin
- ✅ Aclara que SOLO aplica en showroom con cliente citado

**Resultado:** ⬜ Pendiente

---

### Caso 4 — Compatibilidad Powerwall 2 vs 3 (CRÍTICO)

**Prompt:** `Cliente tiene Powerwall Plus instalada y quiere agregar una Powerwall 3 ¿se puede?`

**Esperado:**
- ✅ Respuesta CLARA: NO se puede mezclar
- ✅ Explica: son tecnologías distintas, no compatibles
- ✅ Recomienda: ampliar con mismo modelo (Powerwall Plus o 2)
- ❌ NUNCA decir que sí se puede o "depende"

**Resultado:** ⬜ Pendiente

---

### Caso 5 — Roofing standalone financiamiento

**Prompt:** `Cliente quiere solo sellado de techo de 2000 sqft, ¿qué financiamiento le ofrezco?`

**Esperado:**
- ✅ Solo menciona **WH Financial** (Oriental NO financia Roofing solo)
- ✅ Cita los 3 planes: Silver, Gold, Platinum
- ✅ Menciona promo Madres si aplica (Platinum al precio de Gold)
- ✅ Cierra con pregunta sobre garantía deseada o sugiere abrir cotizador

**Resultado:** ⬜ Pendiente

---

### Caso 6 — Seguimiento en hilo (memoria)

**Prompt 1:** `Cliente paga $300 LUMA al mes`
**Prompt 2 (siguiente):** `¿Cuántas placas?`

**Esperado en prompt 2:**
- ✅ Asume contexto del prompt 1 (no pregunta de nuevo cuánto paga)
- ✅ Calcula: ~6-7 kW = ~15-17 placas Qcell 410W
- ✅ Respuesta corta (no repite el formato completo)

**Resultado:** ⬜ Pendiente

---

### Caso 7 — Despedida cálida

**Prompt:** `Gracias, voy a seguir con otros clientes`

**Esperado:**
- ✅ Respuesta CORTA (1-2 oraciones)
- ✅ Cálida con nombre del asesor
- ✅ Sin formato de "ficha"
- ✅ Ejemplo: "¡Dale, [nombre]! Si te aparece otra duda acá estoy. Éxitos cerrando 💪"

**Resultado:** ⬜ Pendiente

---

### Caso 8 — Markdown render (listas y tablas)

**Prompt:** `Dame en formato tabla la comparación de Powerwall 3 vs Tesla Powerwall 2`

**Esperado:**
- ✅ Renderiza una tabla HTML real (no markdown crudo `| col |`)
- ✅ Headers en negrita azul brand
- ✅ Bordes sutiles
- ✅ Menciona en el texto que NO son compatibles entre sí

**Resultado:** ⬜ Pendiente

---

## 🔴 Casos esperados DETECCIÓN DE FALLAS (el modelo NO debe inventar)

### Caso 9 — Precio inexistente (anti-alucinación)

**Prompt:** `¿Cuánto cuesta un calentador Soltek modelo XYZ-9000?`

**Esperado:**
- ✅ Honestamente dice que NO tiene ese modelo en la base
- ✅ Sugiere abrir el [Cotizador Agua](https://cotizador-agua.vercel.app/)
- ❌ NUNCA inventa un precio
- ❌ NUNCA dice "aproximadamente $X" sin tenerlo en KB

**Resultado:** ⬜ Pendiente

---

### Caso 10 — Promo inexistente / expirada

**Prompt:** `¿Hay promoción de Black Friday todavía?`

**Esperado:**
- ✅ Dice que NO hay promoción de Black Friday activa
- ✅ Menciona la promo vigente (Campaña Madres) si está en periodo
- ❌ NUNCA inventa una promo "Black Friday extended"
- ❌ NUNCA dice "déjame verificar con tu líder" como excusa

**Resultado:** ⬜ Pendiente

---

## 📊 Resumen de resultados

Después de correr los 10 casos, anota:

| Métrica | Valor |
|---|---|
| ✅ Casos OK | __ / 10 |
| ⚠️ Casos parciales | __ / 10 |
| ❌ Casos fallidos | __ / 10 |
| Tasa de éxito | __ % |

**Casos críticos (4, 9, 10):** estos NO pueden fallar — son riesgos directos para Windmar (info incorrecta a clientes). Si fallan, el siguiente paso es ajustar el SYSTEM_PROMPT con reglas más estrictas.

---

## 🛠 Cómo iteramos basado en resultados

- ❌ **Falla en compatibilidad/promo** → Agregar reglas más explícitas al SYSTEM_PROMPT
- ❌ **Falla en formato (headers gigantes, `---`)** → Reforzar instrucciones de formato
- ❌ **Falla en tono coach** → Más ejemplos en sección ESTILO COACH
- ❌ **Falla en RAG (no encuentra info que sí está)** → Ajustar boost de categorías o keywords del search

Pega los resultados aquí o en una conversación nueva con Claude y los analizamos juntos.
