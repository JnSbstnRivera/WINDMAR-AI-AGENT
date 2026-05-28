---
tags: [comandos, slash, productividad, ux]
fecha: 2026-05-26
---

# 🎮 Comandos slash

> [!info] Todos se interceptan en el cliente
> Los comandos NO gastan tokens del LLM. Se detectan en `ChatApp.tsx` antes de hacer la llamada al backend, lo que los hace **instantáneos**.

---

## Productividad

### `/@` · `/seguimiento` · `/correos`

Abre el modal de [[08 - Sistema de correos]] con las 6 plantillas.

**Aliases extra:** `/correo` · `/email` · `/followup`

> [!tip] El más rápido: /@
> `@` es el símbolo universal de correo. Es el más corto y natural.

### `/sobre`

Muestra el manifiesto del bot — qué es, qué hace, créditos, lista de comandos disponibles. Útil para asesores nuevos.

---

## Estáticos (sin LLM)

### `/sunbot`

Saludo formal del SUN BOT con su ASCII art completo (en `easter-eggs.ts`):

```
                                  --
                                 :--:
                                :-==-:
                               --=++=-:
                              --=+**++-=
                             %+++++++++=#
          ...
```

Cero costo, instantáneo.

### `/temblor`

Protocolo sísmico de Puerto Rico — qué hacer ANTES, DURANTE y DESPUÉS de un temblor:

> 🟧 **ANTES (preparación)** — zonas seguras, asegurar objetos, kit de emergencia...
> 🟥 **DURANTE** — DROP · COVER · HOLD ON
> 🟩 **DESPUÉS** — revisar heridas, no encender llamas, evaluar daños...

Incluye contactos de emergencia 911 y frecuencias de radio.

> [!tip] Por qué lo incluimos
> Puerto Rico es zona sísmica activa. Tener el protocolo a un slash de distancia puede salvar vidas. El bot trabaja durante turnos largos — si tiembla en medio de una llamada, el asesor sabe qué hacer.

---

## Juegos retro

Ver [[10 - Easter eggs]] para detalles de cada juego.

### `/snake` o `/serpiente`
Mini-juego clásico con SUN BOT happy como cabeza, cuerpo naranja sólido, comida cyan pulsante.

### `/pong`
Pong vs IA. Paddle tuya naranja, IA cyan. Primero a 5 gana.

### `/invaders` · `/space` · `/play` · `/juego`
Space Invaders con tema solar:
- **Tú** = SUN BOT happy 340%
- **Aliens** = nubes negras ☁ 3.2em
- **Disparas** rayos ⚡ amarillos
- **Las nubes** llueven gotas 💧 contra ti

---

## Estructura técnica

```typescript
// src/components/ChatApp.tsx
async function sendMessage(text: string) {
  const cmd = text.trim().toLowerCase();

  // Juegos
  if (cmd === '/invaders' || cmd === '/juego') {
    setInvadersOpen(true);
    return;
  }
  if (cmd === '/snake' || cmd === '/serpiente') {
    setSnakeOpen(true);
    return;
  }
  if (cmd === '/pong') {
    setPongOpen(true);
    return;
  }

  // Correos
  if (
    cmd === '/@' ||
    cmd === '/seguimiento' ||
    cmd === '/correos' ||
    cmd === '/correo' ||
    cmd === '/email' ||
    cmd === '/followup'
  ) {
    setFollowUpOpen(true);
    return;
  }

  // Estáticos
  if (cmd === '/sunbot') {
    insertStaticReply(SUNBOT_ART);
    return;
  }
  if (cmd === '/temblor') {
    insertStaticReply(TEMBLOR_TEXT);
    return;
  }
  if (cmd === '/sobre') {
    insertStaticReply(ABOUT_TEXT);
    return;
  }

  // Si no es comando, pasa al LLM normalmente
  // ...
}
```

---

## Por qué no usamos slash menu

> [!tip] Decisión UX consciente
> Considerado un menú flotante tipo Notion/Slack que aparezca al escribir `/`. Decidimos NO implementarlo porque:
> 1. El asesor está en llamada — necesita teclear rápido sin distracciones visuales
> 2. Los comandos son pocos (~10) y memorables
> 3. `/sobre` da la lista completa cuando hace falta
>
> Si crece a 20+ comandos, lo reconsideramos.

---

## Conexiones

- 🎮 Detalle de los juegos: [[10 - Easter eggs]]
- 📧 Detalle del modal de correos: [[08 - Sistema de correos]]
- 🧠 El bot no procesa estos comandos (interceptados client-side): [[03 - Flujo de pregunta]]

[[00 🌞 MOC|← Volver al MOC]]
