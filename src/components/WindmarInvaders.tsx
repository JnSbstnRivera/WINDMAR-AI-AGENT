'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Props {
  onClose: () => void;
}

// ════════════════════════════════════════
// WINDMAR INVADERS — Grid CSS con SUN BOT como nave
// ════════════════════════════════════════
// Tank (player) = SUN BOT happy (imagen)
// Aliens = placas solares (▓ cyan)
// Bullets player = │ naranja, bullets enemigo = ! rosa
// 3 vidas, R para reintentar, ESC para salir

const COLS = 32;
const ROWS = 16;
const ALIEN_ROWS = 4;
const ALIEN_COLS = 8;
const ALIEN_START_X = 3;
const ALIEN_START_Y = 1;
const PLAYER_Y = ROWS - 1;
const TICK_MS = 80;

type Pos = { x: number; y: number };
type CellKind = 'empty' | 'star' | 'alien' | 'bullet-p' | 'bullet-e' | 'player';

export function WindmarInvaders({ onClose }: Props) {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'gameover'>('playing');
  const [grid, setGrid] = useState<CellKind[][]>(() => emptyGrid());

  const playerRef = useRef<number>(Math.floor(COLS / 2));
  const aliensRef = useRef<Pos[]>([]);
  const playerBulletsRef = useRef<Pos[]>([]);
  const alienBulletsRef = useRef<Pos[]>([]);
  const alienDirRef = useRef<1 | -1>(1);
  const alienMoveCounterRef = useRef(0);
  const alienMoveEveryRef = useRef(8);
  const keysRef = useRef({ left: false, right: false });
  const lastShotRef = useRef(0);
  const starsRef = useRef<Pos[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

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
    starsRef.current = Array.from({ length: 16 }, () => ({
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * (ROWS - 2)) + 1,
    }));
    initLevel(1);
    containerRef.current?.focus();
  }, [initLevel]);

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

  useEffect(() => {
    const id = setInterval(() => {
      if (gameState !== 'playing') {
        setGrid(renderFrame());
        return;
      }

      if (keysRef.current.left && playerRef.current > 1) playerRef.current -= 1;
      if (keysRef.current.right && playerRef.current < COLS - 2) playerRef.current += 1;

      playerBulletsRef.current.forEach((b) => (b.y -= 1));
      playerBulletsRef.current = playerBulletsRef.current.filter((b) => b.y >= 0);

      alienBulletsRef.current.forEach((b) => (b.y += 1));
      alienBulletsRef.current = alienBulletsRef.current.filter((b) => b.y < ROWS);

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

        if (aliens.length > 0 && Math.random() < 0.35) {
          const shooter = aliens[Math.floor(Math.random() * aliens.length)];
          alienBulletsRef.current.push({ x: shooter.x, y: shooter.y + 1 });
        }

        for (const a of aliens) {
          if (a.y >= PLAYER_Y - 1) {
            setGameState('gameover');
            break;
          }
        }
      }

      for (const b of playerBulletsRef.current) {
        const hit = aliensRef.current.findIndex((a) => a.x === b.x && a.y === b.y);
        if (hit !== -1) {
          aliensRef.current.splice(hit, 1);
          b.y = -1;
          setScore((s) => s + 10);
        }
      }
      playerBulletsRef.current = playerBulletsRef.current.filter((b) => b.y >= 0);

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

  function renderFrame(): CellKind[][] {
    const g = emptyGrid();
    for (const s of starsRef.current) {
      if (g[s.y] && s.x < COLS) g[s.y][s.x] = 'star';
    }
    for (const a of aliensRef.current) {
      if (g[a.y] && a.x < COLS) g[a.y][a.x] = 'alien';
    }
    for (const b of playerBulletsRef.current) {
      if (b.y >= 0 && b.y < ROWS && b.x < COLS) g[b.y][b.x] = 'bullet-p';
    }
    for (const b of alienBulletsRef.current) {
      if (b.y >= 0 && b.y < ROWS && b.x < COLS) g[b.y][b.x] = 'bullet-e';
    }
    if (g[PLAYER_Y]) g[PLAYER_Y][playerRef.current] = 'player';
    return g;
  }

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="mx-auto my-3 max-w-[760px] w-full rounded-xl border-2 outline-none wm-fade-in"
      style={{
        background: 'linear-gradient(180deg, #060810 0%, #0a1628 50%, #1B3A5C 100%)',
        borderColor: 'rgba(247,148,29,0.5)',
        boxShadow: '0 0 32px rgba(247,148,29,0.25), 0 0 64px rgba(124,58,237,0.15)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-orange-500/30">
        <div>
          <p className="text-[15px] font-bold tracking-widest" style={{ fontFamily: 'monospace', color: '#F7941D', textShadow: '0 0 10px rgba(247,148,29,0.6)' }}>
            ☀ WINDMAR INVADERS
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5" style={{ fontFamily: 'monospace' }}>
            ← → mover · ESPACIO disparar · ESC salir
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-red-400 cursor-pointer p-1.5" aria-label="Cerrar juego">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="flex justify-between px-4 py-2 border-b border-orange-500/20 text-[13px]" style={{ fontFamily: 'monospace', color: '#F7941D', letterSpacing: '0.1em' }}>
        <span>SCORE: <strong>{score.toString().padStart(4, '0')}</strong></span>
        <span>LIVES: {'♥'.repeat(Math.max(0, lives))}{'·'.repeat(3 - Math.max(0, lives))}</span>
        <span>LVL: <strong>{level}</strong></span>
      </div>

      <div className="relative px-3 py-3 select-none">
        <div
          className="mx-auto"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
            aspectRatio: `${COLS} / ${ROWS}`,
            maxWidth: '100%',
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(247,148,29,0.18)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {grid.flatMap((row, ri) =>
            row.map((cell, ci) => (
              <div
                key={`${ri}-${ci}`}
                className="flex items-center justify-center relative"
                style={{ fontFamily: 'monospace', fontSize: '0.85em', lineHeight: 1 }}
              >
                {cell === 'star' && <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>}
                {cell === 'alien' && (
                  <span style={{ color: '#06b6d4', fontSize: '1.4em', textShadow: '0 0 8px rgba(6,182,212,0.6)' }}>▓</span>
                )}
                {cell === 'bullet-p' && (
                  <span style={{ color: '#F7941D', fontSize: '1.3em', textShadow: '0 0 6px rgba(247,148,29,0.9)', fontWeight: 'bold' }}>│</span>
                )}
                {cell === 'bullet-e' && (
                  <span style={{ color: '#f43f5e', fontSize: '1.3em', textShadow: '0 0 6px rgba(244,63,94,0.9)', fontWeight: 'bold' }}>!</span>
                )}
                {cell === 'player' && (
                  <img
                    src="/sunbot-feliz.png"
                    alt=""
                    style={{
                      width: '160%',
                      height: '160%',
                      objectFit: 'contain',
                      imageRendering: 'pixelated',
                      filter: 'drop-shadow(0 0 8px rgba(247,148,29,0.85))',
                      zIndex: 2,
                    }}
                  />
                )}
              </div>
            ))
          )}
        </div>

        {gameState === 'gameover' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(6, 8, 16, 0.85)', backdropFilter: 'blur(2px)', borderRadius: 8, margin: 12 }}>
            <p className="text-3xl font-bold mb-2" style={{ fontFamily: 'monospace', color: '#f43f5e', textShadow: '0 0 18px rgba(244,63,94,0.7)' }}>
              GAME OVER
            </p>
            <p className="text-base text-gray-300" style={{ fontFamily: 'monospace' }}>
              Score: <strong style={{ color: '#F7941D' }}>{score}</strong> · Nivel: <strong>{level}</strong>
            </p>
            <p className="text-xs text-gray-400 mt-3" style={{ fontFamily: 'monospace' }}>
              <kbd className="px-2 py-0.5 rounded bg-white/10">R</kbd> reintentar · <kbd className="px-2 py-0.5 rounded bg-white/10">ESC</kbd> salir
            </p>
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-orange-500/20 text-center">
        <p className="text-[10px] text-gray-500" style={{ fontFamily: 'monospace' }}>
          Click acá para enfocar · ESC para volver al chat
        </p>
      </div>
    </div>
  );
}

function emptyGrid(): CellKind[][] {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 'empty' as CellKind));
}
