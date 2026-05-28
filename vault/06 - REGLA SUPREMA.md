---
tags: [regla, negocio, crítico, compliance]
fecha: 2026-05-26
---

# ⚠️ REGLA SUPREMA — Cero precios concretos

> [!danger] LA REGLA QUE NO SE ROMPE
> El bot **NUNCA** debe dar:
> - Precios específicos de productos Windmar
> - Mensualidades calculadas
> - Ahorros estimados ("ahorrarías $X al año")
> - Frases tipo "desde $X" o "hasta $Y"
> - Columnas de precio en tablas comparativas
> - Estimaciones de payback / ROI

---

## Por qué existe esta regla

### El razonamiento del negocio

Cita textual del fundador (Juan Sebastián):
> *"No podemos jugar con precios. Solo hablamos de precios de nuestros productos. No podemos decir cuánto se ahorra un cliente, a menos que ya tengamos una factura de él."*

### Razones específicas

1. **Variabilidad real** — el precio depende del tamaño del sistema, financiamiento, descuentos vigentes, condiciones del techo, ubicación, plan elegido. No hay un "precio" estándar.

2. **Responsabilidad legal** — si el bot dice "$X" y el cliente lo cita después, Windmar queda obligado a honrar ese precio. Riesgo financiero.

3. **Diferenciación del cotizador** — Windmar tiene cotizadores oficiales que SÍ pueden dar precios porque toman todos los inputs. El bot debe **dirigir hacia ellos**, no reemplazarlos.

4. **Confianza del cliente** — un asesor que da números aproximados al aire pierde credibilidad. El cliente espera precisión.

---

## Cómo se aplica en el sistema

### 1. En el `SYSTEM_PROMPT`

Aparece **3 veces** con énfasis creciente:
- Al inicio (declaración)
- En reglas inquebrantables (con ejemplos de qué NO decir)
- En anti-patrones (consecuencias de violarla)

### 2. Como `[Recomendación final]`

Cuando el asesor pregunta por precios, el bot redirige al cotizador apropiado:

> "Para darte el número exacto necesitamos los datos del cliente. Usa el **[Cotizador Loan](https://...)** con la factura de LUMA del cliente. Te toma 1 minuto."

### 3. En las plantillas de correo

Ninguna de las 6 plantillas menciona precios. Ver [[08 - Sistema de correos]].

### 4. En el análisis de documentos

Cuando se sube una cotización o contrato, el bot **menciona** que el doc incluye precios pero **NO los lee/repite**:

> "Adjuntaste una cotización para sistema solar 8kW. Incluye precio detallado. ¿Necesitas que revise algún campo específico?"

---

## Qué SÍ puede decir el bot

✅ "El sistema X tiene un precio base que varía según [factores]"
✅ "Para tu cliente con consumo de $X, el [Cotizador Loan] calculará el plan exacto"
✅ "Los planes de financiamiento van desde Y meses hasta Z meses"
✅ "Loan tiene crédito federal ITC 30% (esto es dato técnico, no precio)"
✅ "Lease es cero pago inicial — buena opción para X cliente"

## Qué NUNCA puede decir

❌ "El sistema cuesta $25,000"
❌ "Pagarías $200 al mes"
❌ "Ahorrarías $2,400 al año"
❌ "Desde $150 mensuales"
❌ "Payback en 6 años"

---

## Excepción: cuando el asesor ya tiene la factura

Si el asesor sube una factura de LUMA real del cliente, el bot puede:
- Extraer el consumo (kWh) y cobro mensual del cliente
- Decir "el cliente paga $X según su factura"
- Recomendar el cotizador con esos inputs

**Pero NUNCA proyectar:**
- "Si instala solar, pagaría $Y nuevos"
- "Ahorraría $Z después"

Esos números los da el cotizador, no el bot.

---

## Auditoría

> [!info] Cómo verificamos cumplimiento
> En el [[11 - Dashboard admin]] revisamos los downvotes (👎). Si algún asesor reporta que el bot dio un precio, se investiga el mensaje y se ajusta el SYSTEM_PROMPT.

---

## Conexiones

- 🧠 Dónde vive esta regla en el código: [[05 - SYSTEM_PROMPT]]
- 📧 Cómo se respeta en correos: [[08 - Sistema de correos]]
- 📊 Cómo se audita: [[11 - Dashboard admin]]

[[00 🌞 MOC|← Volver al MOC]]
