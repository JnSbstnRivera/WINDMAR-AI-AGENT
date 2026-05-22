'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Props {
  onClose: () => void;
}

// ════════════════════════════════════════
// WINDMAR INVADERS ASCII — inline en el chat
// ════════════════════════════════════════
// Mini-juego ASCII puro tipo Space Invaders. Se renderiza inline
// encima del input del chat (no overlay full-screen).
// Compacto (~520x320px), responsive, captura teclado solo cuando activo.
//
// Controles: ← → mover · ESPACIO disparar · ESC cerrar · R reintentar

const COLS = 32;
const ROWS = 14;
const ALIEN_ROWS = 4;
const ALIEN_COLS = 8;
const ALIEN_START_X = 3;
const ALIEN_START_Y = 1;
const PLAYER_Y = ROWS - 1;
const TICK_MS = 80; // velocidad del loop (12.5 fps — adecuado para ASCII)

type Cell = { c: string; cls: string };
type Pos = { x: number; y: number };

export function WindmarInvaders({ onClose }: Props) {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'gameover'>('playing');
  const [grid, setGrid] = useState<Cell[][]>(() => emptyGrid());

  const playerRef = useRef<number>(Math.floor(COLS / 2));
  const aliensRef = useRef<Pos[]>([]);
  const playerBulletsRef = useRef<Pos[]>([]);
  const alienBulletsRef = useRef<Pos[]>([]);
  const alienDirRef = useRef<1 | -1>(1);
  const alienMoveCounterRef = useRef(0);
  const alienMoveEveryRef = useRef(8); // mueve aliens cada N ticks
  const keysRef = useRef({ left: false, right: false });
  const lastShotRef = useRef(0);
  const starsRef = useRef<Pos[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // ════════════════════════════════════════
  // INIT
  // ════════════════════════════════════════
  const initLevel = useCallback((lvl: number) => {
    const aliens: Pos[] = [];
    for (let r = 0; r < ALIEN_ROWS; r++) {
      for (let c = 0; c < ALIEN_COLS; c++) {
        aliens.push({ x: ALIEN_START_X + c * 3, y: ALIEN_START_Y + r });
      }
    }
    aliensRef.current = aliens;
    playerBulletsRef.current = [];
    alienBulletsRef.current = [];
    alienDirRef.current = 1;
    alienMoveEveryRef.current = Math.max(2, 8 - (lvl - 1));
    alienMoveCounterRef.current = 0;
    playerRef.current = Math.floor(COLS / 2);
  }, []);

  useEffect(() => {
    starsRef.current = Array.from({ length: 12 }, () => ({
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * (ROWS - 2)) + 1,
    }));
    initLevel(1);
    containerRef.current?.focus();
  }, [initLevel]);

  // ════════════════════════════════════════
  // CONTROLES (solo cuando el componente está montado)
  // ════════════════════════════════════════
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        keysRef.current.left = true;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        keysRef.current.right = true;
      } else if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        shoot();
      } else if (e.key === 'Escape') {
        onClose();
      } else if ((e.key === 'r' || e.key === 'R') && gameState === 'gameover') {
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
    if (now - lastShotRef.current < 220) return;
    lastShotRef.current = now;
    playerBulletsRef.current.push({ x: playerRef.current, y: PLAYER_Y - 1 });
  }

  // ════════════════════════════════════════
  // GAME LOOP
  // ════════════════════════════════════════
  useEffect(() => {
    const id = setInterval(() => {
      if (gameState !== 'playing') {
        setGrid(renderFrame());
        return;
      }

      // Player move
      if (keysRef.current.left && playerRef.current > 1) playerRef.current -= 1;
      if (keysRef.current.right && playerRef.current < COLS - 2) playerRef.current += 1;

      // Player bullets up
      playerBulletsRef.current.forEach((b) => (b.y -= 1));
      playerBulletsRef.current = playerBulletsRef.current.filter((b) => b.y >= 0);

      // Alien bullets down
      alienBulletsRef.current.forEach((b) => (b.y += 1));
      alienBulletsRef.current = alienBulletsRef.current.filter((b) => b.y < ROWS);

      // Alien movement (cada N ticks)
      alienMoveCounterRef.current += 1;
      if (alienMoveCounterRef.current >= alienMoveEveryRef.current) {
        alienMoveCounterRef.current = 0;
        const aliens = aliensRef.current;
        let hitEdge = false;
        for (const a of aliens) {
          const nx = a.x + alienDirRef.current;
          if (nx < 1 || nx > COLS - 2) { hitEdge = true; break; }
        }
        if (hitEdge) {
          alienDirRef.current = (alienDirRef.current === 1 ? -1 : 1) as 1 | -1;
          for (const a of aliens) a.y += 1;
        } else {
          for (const a of aliens) a.x += alienDirRef.current;
        }

        // Alien shoot al azar (uno solo)
        if (aliens.length > 0 && Math.random() < 0.35) {
          const shooter = aliens[Math.floor(Math.random() * aliens.length)];
          alienBulletsRef.current.push({ x: shooter.x, y: shooter.y + 1 });
        }

        // Aliens llegan a la fila del player
        for (const a of aliens) {
          if (a.y >= PLAYER_Y - 1) {
            setGameState('gameover');
            break;
          }
        }
      }

      // Colisión bullet → alien
      for (const b of playerBulletsRef.current) {
        const hit = aliensRef.current.findIndex((a) => a.x === b.x && a.y === b.y);
        if (hit !== -1) {
          aliensRef.current.splice(hit, 1);
          b.y = -1; // marca para limpiar
          setScore((s) => s + 10);
        }
      }
      playerBulletsRef.current = playerBulletsRef.current.filter((b) => b.y >= 0);

      // Colisión bullet enemigo → player
      for (const b of alienBulletsRef.current) {
        if (b.y === PLAYER_Y && b.x === playerRef.current) {
          b.y = -1;
          setLives((l) => {
            const nl = l - 1;
            if (nl <= 0) setGameState('gameover');
            return nl;
          });
        }
      }
      alienBulletsRef.current = alienBulletsRef.current.filter((b) => b.y >= 0);

      // Win → siguiente nivel
      if (aliensRef.current.length === 0) {
        setLevel((lv) => {
          const next = lv + 1;
          initLevel(next);
          return next;
        });
      }

      setGrid(renderFrame());
    }, TICK_MS);
    return () => clearInterval(id);
  }, [gameState, initLevel]);

  function renderFrame(): Cell[][] {
    const g: Cell[][] = emptyGrid();
    // Estrellas
    for (const s of starsRef.current) {
      if (g[s.y]) g[s.y][s.x] = { c: '·', cls: 'text-white/20' };
    }
    // Aliens (placas solares)
    for (const a of aliensRef.current) {
      if (g[a.y] && a.x < COLS) g[a.y][a.x] = { c: '▓', cls: 'text-cyan-400' };
    }
    // Bullets player
    for (const b of playerBulletsRef.current) {
      if (b.y >= 0 && b.y < ROWS && b.x < COLS) g[b.y][b.x] = { c: '│', cls: 'text-orange-400' };
    }
    // Bullets enemigos
    for (const b of alienBulletsRef.current) {
      if (b.y >= 0 && b.y < ROWS && b.x < COLS) g[b.y][b.x] = { c: '!', cls: 'text-rose-400' };
    }
    // Player tank
    if (g[PLAYER_Y]) g[PLAYER_Y][playerRef.current] = { c: '▲', cls: 'text-orange-500' };
    return g;
  }

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="mx-auto my-3 max-w-[560px] rounded-xl border-2 outline-none wm-fade-in"
      style={{
        background: 'linear-gradient(180deg, #060810 0%, #0a1628 50%, #1B3A5C 100%)',
        borderColor: 'rgba(247,148,29,0.5)',
        boxShadow: '0 0 24px rgba(247,148,29,0.2), 0 0 48px rgba(124,58,237,0.15)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-orange-500/30">
        <div>
          <p
            className="text-[13px] font-bold tracking-widest"
            style={{ fontFamily: 'monospace', color: '#F7941D', textShadow: '0 0 8px rgba(247,148,29,0.6)' }}
          >
            ☀ WINDMAR INVADERS
          </p>
          <p className="text-[9px] text-gray-400 mt-0.5" style={{ fontFamily: 'monospace' }}>
            ← → mover · ESPACIO disparar · ESC salir
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-red-400 cursor-pointer p-1"
          aria-label="Cerrar juego"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* HUD */}
      <div
        className="flex justify-between px-3 py-1.5 border-b border-orange-500/20 text-[11px]"
        style={{ fontFamily: 'monospace', color: '#F7941D', letterSpacing: '0.1em' }}
      >
        <span>SCORE: <strong>{score.toString().padStart(4, '0')}</strong></span>
        <span>LIVES: {'♥'.repeat(Math.max(0, lives))}{'·'.repeat(3 - Math.max(0, lives))}</span>
        <span>LVL: <strong>{level}</strong></span>
      </div>

      {/* Game board (ASCII grid) */}
      <div className="relative px-3 py-2 select-none">
        <pre
          className="leading-[1.1] text-center"
          style={{
            fontFamily: '"JetBrains Mono", "Courier New", monospace',
            fontSize: 'clamp(11px, 2.4vw, 16px)',
            lineHeight: '1.1',
            margin: 0,
          }}
        >
          {grid.map((row, ri) => (
            <div key={ri} className="whitespace-pre">
              {row.map((cell, ci) => (
                <span key={ci} className={cell.cls}>{cell.c}</span>
              ))}
            </div>
          ))}
        </pre>

        {/* Game over overlay */}
        {gameState === 'gameover' && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ background: 'rgba(6, 8, 16, 0.85)', backdropFilter: 'blur(2px)' }}
          >
            <p
              className="text-2xl font-bold mb-1"
              style={{ fontFamily: 'monospace', color: '#f43f5e', textShadow: '0 0 16px rgba(244,63,94,0.7)' }}
            >
              GAME OVER
            </p>
            <p className="text-sm text-gray-300" style={{ fontFamily: 'monospace' }}>
              Score: <strong style={{ color: '#F7941D' }}>{score}</strong>
            </p>
            <p className="text-[10px] text-gray-400 mt-2" style={{ fontFamily: 'monospace' }}>
              Presiona <kbd className="px-1.5 py-0.5 rounded bg-white/10">R</kbd> para reintentar
            </p>
          </div>
        )}
      </div>

      {/* Footer mini */}
      <div className="px-3 py-1.5 border-t border-orange-500/20 text-center">
        <p className="text-[9px] text-gray-500" style={{ fontFamily: 'monospace' }}>
          Click acá para enfocar · Sigue chateando cuando quieras
        </p>
      </div>
    </div>
  );
}

function emptyGrid(): Cell[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ c: ' ', cls: '' }))
  );
}
