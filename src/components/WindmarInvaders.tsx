'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Props {
  onClose: () => void;
}

// ════════════════════════════════════════
// WINDMAR INVADERS — Easter egg / mini-juego
// ════════════════════════════════════════
// Space Invaders clásico con tema Windmar:
// - Tanque (SUN BOT) abajo, disparando hacia arriba
// - Aliens = placas solares en fila que bajan
// - Disparos = rayos naranja brand
// - Cuando los aliens llegan abajo o te toca uno → game over
// - Si destruyes a todos → level up (más rápidos)
//
// Controles: ← / → mover · ESPACIO disparar · ESC salir

const CW = 640;
const CH = 720;
const PLAYER_W = 56;
const PLAYER_H = 40;
const PLAYER_SPEED = 6;
const ALIEN_W = 44;
const ALIEN_H = 32;
const ALIEN_GAP_X = 18;
const ALIEN_GAP_Y = 18;
const ALIEN_ROWS = 4;
const ALIEN_COLS = 8;
const ALIEN_TOP = 80;
const BULLET_W = 4;
const BULLET_H = 14;
const BULLET_SPEED = 9;
const ALIEN_BULLET_SPEED = 4;

type Alien = { x: number; y: number; alive: boolean };
type Bullet = { x: number; y: number; alive: boolean };

export function WindmarInvaders({ onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const playerRef = useRef({ x: CW / 2 - PLAYER_W / 2, y: CH - PLAYER_H - 20 });
  const aliensRef = useRef<Alien[]>([]);
  const playerBulletsRef = useRef<Bullet[]>([]);
  const alienBulletsRef = useRef<Bullet[]>([]);
  const alienDirRef = useRef(1); // 1 = derecha, -1 = izquierda
  const alienSpeedRef = useRef(0.6);
  const keysRef = useRef({ left: false, right: false });
  const lastShotRef = useRef(0);
  const starsRef = useRef<{ x: number; y: number; s: number }[]>([]);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'gameover' | 'won'>('playing');

  // ════════════════════════════════════════
  // INIT — crear aliens en grid y estrellas de fondo
  // ════════════════════════════════════════
  const initLevel = useCallback((lvl: number) => {
    const aliens: Alien[] = [];
    const startX = (CW - ALIEN_COLS * (ALIEN_W + ALIEN_GAP_X)) / 2;
    for (let r = 0; r < ALIEN_ROWS; r++) {
      for (let c = 0; c < ALIEN_COLS; c++) {
        aliens.push({
          x: startX + c * (ALIEN_W + ALIEN_GAP_X),
          y: ALIEN_TOP + r * (ALIEN_H + ALIEN_GAP_Y),
          alive: true,
        });
      }
    }
    aliensRef.current = aliens;
    playerBulletsRef.current = [];
    alienBulletsRef.current = [];
    alienDirRef.current = 1;
    alienSpeedRef.current = 0.6 + (lvl - 1) * 0.25;
    playerRef.current = { x: CW / 2 - PLAYER_W / 2, y: CH - PLAYER_H - 20 };
  }, []);

  useEffect(() => {
    // Estrellas de fondo
    starsRef.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * CW,
      y: Math.random() * CH,
      s: Math.random() * 1.5 + 0.3,
    }));
    initLevel(1);
  }, [initLevel]);

  // ════════════════════════════════════════
  // CONTROLES — teclado
  // ════════════════════════════════════════
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = true;
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        shoot();
      }
      if (e.key === 'Escape') onClose();
      if ((e.key === 'r' || e.key === 'R') && gameState !== 'playing') {
        setScore(0);
        setLives(3);
        setLevel(1);
        initLevel(1);
        setGameState('playing');
      }
    }
    function up(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = false;
    }
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, gameState]);

  function shoot() {
    if (gameState !== 'playing') return;
    const now = Date.now();
    if (now - lastShotRef.current < 280) return;
    lastShotRef.current = now;
    playerBulletsRef.current.push({
      x: playerRef.current.x + PLAYER_W / 2 - BULLET_W / 2,
      y: playerRef.current.y - 4,
      alive: true,
    });
  }

  // ════════════════════════════════════════
  // GAME LOOP
  // ════════════════════════════════════════
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function loop() {
      if (!ctx || !canvas) return;
      // ─── UPDATE ────────────────────
      if (gameState === 'playing') {
        // Player movement
        const p = playerRef.current;
        if (keysRef.current.left && p.x > 8) p.x -= PLAYER_SPEED;
        if (keysRef.current.right && p.x < CW - PLAYER_W - 8) p.x += PLAYER_SPEED;

        // Player bullets
        playerBulletsRef.current.forEach((b) => { b.y -= BULLET_SPEED; if (b.y < 0) b.alive = false; });

        // Alien bullets
        alienBulletsRef.current.forEach((b) => { b.y += ALIEN_BULLET_SPEED; if (b.y > CH) b.alive = false; });

        // Alien movement
        const aliens = aliensRef.current.filter((a) => a.alive);
        let hitEdge = false;
        for (const a of aliens) {
          a.x += alienSpeedRef.current * alienDirRef.current;
          if (a.x < 8 || a.x + ALIEN_W > CW - 8) hitEdge = true;
        }
        if (hitEdge) {
          alienDirRef.current *= -1;
          for (const a of aliens) a.y += 22;
        }

        // Aliens shoot al azar
        if (Math.random() < 0.012 + (level - 1) * 0.005 && aliens.length > 0) {
          const shooter = aliens[Math.floor(Math.random() * aliens.length)];
          alienBulletsRef.current.push({
            x: shooter.x + ALIEN_W / 2 - BULLET_W / 2,
            y: shooter.y + ALIEN_H,
            alive: true,
          });
        }

        // Colisiones bullet → alien
        for (const b of playerBulletsRef.current) {
          if (!b.alive) continue;
          for (const a of aliensRef.current) {
            if (!a.alive) continue;
            if (b.x < a.x + ALIEN_W && b.x + BULLET_W > a.x && b.y < a.y + ALIEN_H && b.y + BULLET_H > a.y) {
              a.alive = false;
              b.alive = false;
              setScore((s) => s + 10);
            }
          }
        }

        // Colisiones bullet → player
        for (const b of alienBulletsRef.current) {
          if (!b.alive) continue;
          if (b.x < p.x + PLAYER_W && b.x + BULLET_W > p.x && b.y < p.y + PLAYER_H && b.y + BULLET_H > p.y) {
            b.alive = false;
            setLives((l) => {
              const newL = l - 1;
              if (newL <= 0) setGameState('gameover');
              return newL;
            });
          }
        }

        // Aliens llegan abajo
        for (const a of aliensRef.current) {
          if (a.alive && a.y + ALIEN_H >= p.y) {
            setGameState('gameover');
            break;
          }
        }

        // Limpiar bullets muertos
        playerBulletsRef.current = playerBulletsRef.current.filter((b) => b.alive);
        alienBulletsRef.current = alienBulletsRef.current.filter((b) => b.alive);

        // Si no quedan aliens → level up
        if (aliens.length === 0) {
          setLevel((lv) => {
            const next = lv + 1;
            initLevel(next);
            return next;
          });
        }
      }

      // ─── RENDER ────────────────────
      // Fondo gradient navy
      const grad = ctx.createLinearGradient(0, 0, 0, CH);
      grad.addColorStop(0, '#060810');
      grad.addColorStop(0.5, '#0a1628');
      grad.addColorStop(1, '#1B3A5C');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CW, CH);

      // Estrellas
      for (const star of starsRef.current) {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + star.s * 0.4})`;
        ctx.fillRect(star.x, star.y, star.s, star.s);
      }

      // Aliens (placas solares estilizadas)
      for (const a of aliensRef.current) {
        if (!a.alive) continue;
        drawSolarPanel(ctx, a.x, a.y);
      }

      // Player (tanque con SUN BOT)
      drawTank(ctx, playerRef.current.x, playerRef.current.y);

      // Player bullets (rayos naranja)
      ctx.fillStyle = '#F7941D';
      ctx.shadowColor = '#F7941D';
      ctx.shadowBlur = 8;
      for (const b of playerBulletsRef.current) {
        ctx.fillRect(b.x, b.y, BULLET_W, BULLET_H);
      }
      ctx.shadowBlur = 0;

      // Alien bullets (rayos rojos)
      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 6;
      for (const b of alienBulletsRef.current) {
        ctx.fillRect(b.x, b.y, BULLET_W, BULLET_H);
      }
      ctx.shadowBlur = 0;

      // Game over / Won overlay
      if (gameState === 'gameover') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, CW, CH);
        ctx.font = 'bold 56px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 20;
        ctx.fillText('GAME OVER', CW / 2, CH / 2 - 20);
        ctx.shadowBlur = 0;
        ctx.font = '18px sans-serif';
        ctx.fillStyle = '#e8edf8';
        ctx.fillText(`Score final: ${score}`, CW / 2, CH / 2 + 20);
        ctx.fillStyle = '#F7941D';
        ctx.font = '14px sans-serif';
        ctx.fillText('Presiona R para reintentar · ESC para salir', CW / 2, CH / 2 + 56);
      }

      animationRef.current = requestAnimationFrame(loop);
    }
    animationRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [gameState, initLevel, level, score]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: 'rgba(6, 8, 16, 0.92)', backdropFilter: 'blur(8px)' }}
    >
      <div className="relative max-w-full max-h-full flex flex-col items-center">
        {/* Header */}
        <div className="flex items-center justify-between w-full mb-3 px-2">
          <div>
            <h2 className="text-xl font-bold text-[#F7941D] tracking-wider" style={{ fontFamily: 'monospace', textShadow: '0 0 12px rgba(247,148,29,0.6)' }}>
              ☀️ WINDMAR INVADERS
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5" style={{ fontFamily: 'monospace' }}>
              ← → mover · ESPACIO disparar · ESC salir · R reintentar
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-red-400 cursor-pointer transition-colors p-2"
            aria-label="Cerrar juego"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* HUD */}
        <div
          className="flex justify-between w-full mb-2 px-3 py-2 rounded-lg"
          style={{
            background: 'rgba(247,148,29,0.08)',
            border: '1px solid rgba(247,148,29,0.3)',
            fontFamily: 'monospace',
            fontSize: 14,
            color: '#F7941D',
            letterSpacing: '0.1em',
          }}
        >
          <span>SCORE: <strong>{score}</strong></span>
          <span>LIVES: {'❤️'.repeat(Math.max(0, lives))}</span>
          <span>LEVEL: <strong>{level}</strong></span>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          tabIndex={0}
          style={{
            display: 'block',
            borderRadius: 12,
            border: '2px solid rgba(247,148,29,0.4)',
            boxShadow: '0 0 30px rgba(247,148,29,0.25), 0 0 60px rgba(124,58,237,0.15)',
            maxWidth: '100%',
            height: 'auto',
          }}
        />
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// DRAW HELPERS
// ════════════════════════════════════════
function drawSolarPanel(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Marco
  ctx.fillStyle = '#1B3A5C';
  ctx.fillRect(x, y, ALIEN_W, ALIEN_H);
  // Borde brillante
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 1, y + 1, ALIEN_W - 2, ALIEN_H - 2);
  ctx.shadowColor = '#06b6d4';
  ctx.shadowBlur = 6;
  // Cells (grid 4x3 de células solares)
  ctx.fillStyle = '#06b6d4';
  const cw = (ALIEN_W - 8) / 4;
  const ch = (ALIEN_H - 8) / 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      ctx.fillRect(x + 4 + c * cw + 1, y + 4 + r * ch + 1, cw - 2, ch - 2);
    }
  }
  ctx.shadowBlur = 0;
}

function drawTank(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.shadowColor = '#F7941D';
  ctx.shadowBlur = 14;
  // Base del tanque (chasis) — naranja Windmar
  ctx.fillStyle = '#F7941D';
  ctx.fillRect(x, y + 18, PLAYER_W, PLAYER_H - 18);
  // Cuerpo central (cabeza SUN BOT)
  ctx.fillStyle = '#FFB347';
  ctx.fillRect(x + 12, y + 4, PLAYER_W - 24, 16);
  // Cañón
  ctx.fillStyle = '#F7941D';
  ctx.fillRect(x + PLAYER_W / 2 - 3, y - 4, 6, 14);
  ctx.shadowBlur = 0;
  // Detalles SUN BOT — ojos
  ctx.fillStyle = '#0a1628';
  ctx.fillRect(x + 16, y + 9, 4, 4);
  ctx.fillRect(x + PLAYER_W - 20, y + 9, 4, 4);
  // Línea central del chasis
  ctx.strokeStyle = '#0a1628';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 28);
  ctx.lineTo(x + PLAYER_W - 4, y + 28);
  ctx.stroke();
}
