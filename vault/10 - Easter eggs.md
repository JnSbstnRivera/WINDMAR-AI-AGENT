---
tags: [juegos, easter-eggs, fun, css-grid]
fecha: 2026-05-26
---

# 👾 Easter eggs y juegos

> [!quote] Por qué hay juegos en una app de trabajo
> *"Pequeños momentos de descanso entre llamadas. Es un guiño cultural y refuerza el branding del SUN BOT como mascota viva. El asesor que descubre `/snake` por accidente se ríe y se lo cuenta al equipo."*

> [!note] Cambio planeado (Fase F — limpieza)
> Hoy los juegos se invocan con sus comandos sueltos (`/snake`, `/pong`, `/invaders`…). Se planea **moverlos bajo `/sobre`** para no saturar la lista principal de comandos. Ver [[16 - Roadmap#🔧 Fase F — Afinamiento]].

---

## 🐍 `/snake` o `/serpiente`

**Concepto:** snake clásico con tema solar.

```
┌──────────────────────────┐
│ 🐍 WINDMAR SNAKE         │
│ Score: 0040 · Best: 120  │
│                          │
│   ●○○○                   │   ← Cabeza = SUN BOT happy 160%
│                          │   ← Cuerpo = bloques naranja
│         ◉                │   ← Comida = círculo cyan pulsante
│                          │
└──────────────────────────┘
```

### Especificaciones técnicas

| Aspecto | Valor |
|---------|-------|
| Grid | 28 × 16 celdas |
| Inicial tick | 130ms |
| Min tick (más rápido) | 55ms |
| Aceleración | -3ms por comida |
| Best score | guardado en `localStorage` (`wm-snake-best`) |

### Controles
- **← ↑ → ↓** o **WASD** — mover
- **R** — reiniciar tras game over
- **ESC** — cerrar

### Detalles especiales
- Grid inicial YA dibujado (no espera al primer tick → aparece al instante)
- Cabeza con drop-shadow naranja
- Comida con `wmPulse` animation (cyan brillante)
- Cuerpo continuo sin huecos visibles

---

## 🏓 `/pong`

**Concepto:** Pong vs IA. Primero en llegar a 5 gana.

```
┌──────────────────────────┐
│ 🏓 WINDMAR PONG          │
│ TÚ: 3        IA: 2       │
│                          │
│ ════════════             │   ← IA arriba (cyan)
│                          │
│             ◦            │   ← Pelota
│                          │
│         ════════════     │   ← Tú abajo (naranja)
└──────────────────────────┘
```

### Especificaciones

| Aspecto | Valor |
|---------|-------|
| Grid | 32 × 14 |
| Paddle width | 5 celdas |
| Tick | 90ms |
| Win score | 5 |

### Controles
- **← →** o **AD** — mover paddle
- **R** — reiniciar
- **ESC** — cerrar

### IA
La IA "ve" la posición X de la pelota y se mueve hacia ella con un pequeño retraso. No es perfecta — el jugador puede ganar.

---

## 👾 `/invaders` · `/space` · `/play` · `/juego`

**Concepto:** Space Invaders pero con tema **solar/clima**:
- **Tú** eres el SUN BOT 🌞 abajo
- **Enemigos** son nubes negras ☁ que tapan el sol
- **Tu arma** son rayos ⚡ amarillos
- **Las nubes te llueven** gotas 💧 (rosa-rojizo)

```
┌────────────────────────────┐
│ ☀ WINDMAR INVADERS        │
│ Score 0080 · Lives ♥♥♥     │
│                            │
│  ☁  ☁  ☁  ☁  ☁  ☁  ☁    │
│  ☁  ☁  ☁  ☁  ☁  ☁  ☁    │   ← Nubes (alien)
│  ☁  ☁  ☁  ☁  ☁  ☁  ☁    │
│       💧                   │   ← Lluvia (bullets enemigo)
│         ⚡                 │   ← Rayo (bullet player)
│                            │
│         🌞                 │   ← SUN BOT happy 340%
│  (sol decorativo detrás)   │
└────────────────────────────┘ 
```

### Especificaciones

| Aspecto          | Valor   |     |
| ---------------- | ------- | --- |
| Grid             | 32 × 16 |     |
| Tick             | 80ms    |     |
| Alien rows       | 4       |     |
| Alien cols       | 8       |     |
| Player vidas     | 3       |     |
| Cooldown disparo | 220ms   |     |

### Tamaños de sprites

| Elemento | Tamaño |
|----------|--------|
| Nubes ☁ | 3.2em |
| SUN BOT (nave) | 340% |
| Rayos ⚡ | 2.2em |
| Gotas 💧 | 1.9em |

### Controles
- **← →** o **AD** — mover
- **ESPACIO** o **↑** — disparar
- **R** — reiniciar
- **ESC** — cerrar

### Detalles especiales
- **Sol decorativo** semitransparente al fondo (el sol que las nubes están tapando)
- Velocidad de aliens aumenta cada nivel
- Random 35% chance de que un alien dispare cada tick
- Drop-shadow naranja intenso en el SUN BOT

---

## Implementación común

Todos los juegos están en `src/components/Windmar*.tsx` y usan:
- **CSS Grid** (no canvas) — más fácil de mantener
- `setInterval` para el game loop
- `useRef` para mutar posiciones sin re-render constante
- `setState(grid)` solo al final de cada tick para re-renderizar
- Mismo header/footer/border-style (rounded-xl + naranja)
- `wm-fade-in` animation al aparecer

---

## Decisión: ¿por qué CSS Grid y no canvas?

> [!tip] Trade-off consciente
> Canvas sería más performante pero:
> - CSS Grid permite usar imágenes (`<img>`) directamente — pixel art crisp
> - Más fácil de debuggear en DevTools
> - Reutilizamos clases Tailwind para estilos
> - Para juegos pequeños (32x16) la diferencia de FPS es imperceptible
>
> Si hiciéramos un juego con muchos sprites animados (50+), migraríamos a canvas.

---

## Conexiones

- 🎮 Cómo se invocan: [[09 - Comandos slash]]
- 🎭 La mascota SUN BOT: [[07 - Features#🎭 Mascota viva — SUN BOT]]

[[00 🌞 MOC|← Volver al MOC]]
