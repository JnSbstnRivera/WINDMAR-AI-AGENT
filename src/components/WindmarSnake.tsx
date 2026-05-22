'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Props {
  onClose: () => void;
}

// ════════════════════════════════════════
// WINDMAR SNAKE ASCII — inline en el chat
// ════════════════════════════════════════
// Snake clásico con temática Windmar:
// - Serpiente = trayecto naranja (▓)
// - Cabeza = naranja brillante (◆)
// - Comida = placa solar (▪ cyan)
// - Choca pared o tu cuerpo → game over
// - Cada placa: +10 score, velocidad sube

const COLS = 28;
const ROWS = 14;
const INITIAL_TICK = 130; // ms
const MIN_TICK = 55;

type Pos = { x: number; y: number };
type Dir = 'up' | 'down' | 'left' | 'right';
type Cell = { c: string; cls: string };

export function WindmarSnake({ onClose }: Props) {
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'gameover'>('playing');
  const [grid, setGrid] = useState<Cell[][]>(() => emptyGrid());

  const snakeRef = useRef<Pos[]>([{ x: 8, y: 7 }, { x: 7, y: 7 }, { x: 6, y: 7 }]);
  const dirRef = useRef<Dir>('right');
  const nextDirRef = useRef<Dir>('right');
  const foodRef = useRef<Pos>({ x: 18, y: 7 });
  const tickRef = useRef<number>(INITIAL_TICK);
  const containerRef = useRef<HTMLDivElement>(null);

  // ════════════════════════════════════════
  // INIT
  // ════════════════════════════════════════
  const reset = useCallback(() => {
    snakeRef.current = [{ x: 8, y: 7 }, { x: 7, y: 7 }, { x: 6, y: 7 }];
    dirRef.current = 'right';
    nextDirRef.current = 'right';
    foodRef.current = randomFreeCell(snakeRef.current);
    tickRef.current = INITIAL_TICK;
    setScore(0);
    setGameState('playing');
  }, []);

  useEffect(() => {
    containerRef.current?.focus();
    // Cargar best score local
    try {
      const saved = localStorage.getItem('wm-snake-best');
      if (saved) setBest(parseInt(saved, 10));
    } catch { /* ignore */ }
  }, []);

  // ════════════════════════════════════════
  // CONTROLES
  // ════════════════════════════════════════
  useEffect(() => {
    function down(e: KeyboardEvent) {
      const k = e.key;
      const cur = dirRef.current;
      // Prevenir 180° (no permitido en snake clásico)
      if ((k === 'ArrowUp' || k === 'w' || k === 'W') && cur !== 'down') { e.preventDefault(); nextDirRef.current = 'up'; }
      else if ((k === 'ArrowDown' || k === 's' || k === 'S') && cur !== 'up') { e.preventDefault(); nextDirRef.current = 'down'; }
      else if ((k === 'ArrowLeft' || k === 'a' || k === 'A') && cur !== 'right') { e.preventDefault(); nextDirRef.current = 'left'; }
      else if ((k === 'ArrowRight' || k === 'd' || k === 'D') && cur !== 'left') { e.preventDefault(); nextDirRef.current = 'right'; }
      else if (k === 'Escape') onClose();
      else if ((k === 'r' || k === 'R') && gameState === 'gameover') reset();
    }
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [onClose, gameState, reset]);

  // ════════════════════════════════════════
  // GAME LOOP
  // ════════════════════════════════════════
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    function step() {
      if (gameState !== 'playing') {
        setGrid(renderFrame());
        timeoutId = setTimeout(step, tickRef.current);
        return;
      }

      dirRef.current = nextDirRef.current;
      const head = { ...snakeRef.current[0] };
      switch (dirRef.current) {
        case 'up': head.y -= 1; break;
        case 'down': head.y += 1; break;
        case 'left': head.x -= 1; break;
        case 'right': head.x += 1; break;
      }

      // Choque con pared
      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
        setGameState('gameover');
        saveBest();
        setGrid(renderFrame());
        timeoutId = setTimeout(step, tickRef.current);
        return;
      }

      // Choque con cuerpo
      if (snakeRef.current.some((seg) => seg.x === head.x && seg.y === head.y)) {
        setGameState('gameover');
        saveBest();
        setGrid(renderFrame());
        timeoutId = setTimeout(step, tickRef.current);
        return;
      }

      snakeRef.current.unshift(head);

      // Comer placa solar
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        setScore((s) => s + 10);
        // Acelera ligeramente
        tickRef.current = Math.max(MIN_TICK, tickRef.current - 3);
        foodRef.current = randomFreeCell(snakeRef.current);
      } else {
        snakeRef.current.pop();
      }

      setGrid(renderFrame());
      timeoutId = setTimeout(step, tickRef.current);
    }

    timeoutId = setTimeout(step, tickRef.current);
    return () => clearTimeout(timeoutId);
  }, [gameState]);

  function saveBest() {
    const final = score;
    if (final > best) {
      setBest(final);
      try { localStorage.setItem('wm-snake-best', String(final)); } catch { /* ignore */ }
    }
  }

  function renderFrame(): Cell[][] {
    const g = emptyGrid();
    // Food
    const f = foodRef.current;
    if (g[f.y] && f.x < COLS) g[f.y][f.x] = { c: '▪', cls: 'text-cyan-400' };
    // Snake body
    snakeRef.current.forEach((seg, i) => {
      if (!g[seg.y] || seg.x >= COLS) return;
      if (i === 0) {
        g[seg.y][seg.x] = { c: '◆', cls: 'text-orange-400' };
      } else {
        g[seg.y][seg.x] = { c: '▓', cls: 'text-orange-300' };
      }
    });
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
          <p className="text-[13px] font-bold tracking-widest" style={{ fontFamily: 'monospace', color: '#F7941D', textShadow: '0 0 8px rgba(247,148,29,0.6)' }}>
            🐍 WINDMAR SNAKE
          </p>
          <p className="text-[9px] text-gray-400 mt-0.5" style={{ fontFamily: 'monospace' }}>
            ← ↑ → ↓ mover · come placas (▪) · ESC salir
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-red-400 cursor-pointer p-1" aria-label="Cerrar juego">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* HUD */}
      <div className="flex justify-between px-3 py-1.5 border-b border-orange-500/20 text-[11px]" style={{ fontFamily: 'monospace', color: '#F7941D', letterSpacing: '0.1em' }}>
        <span>SCORE: <strong>{score.toString().padStart(4, '0')}</strong></span>
        <span style={{ color: '#06b6d4' }}>BEST: {best}</span>
        <span>LEN: {snakeRef.current.length}</span>
      </div>

      {/* Grid */}
      <div className="relative px-3 py-2 select-none">
        <pre
          className="leading-[1.1] text-center"
          style={{ fontFamily: '"JetBrains Mono", "Courier New", monospace', fontSize: 'clamp(11px, 2.4vw, 16px)', lineHeight: '1.1', margin: 0 }}
        >
          {grid.map((row, ri) => (
            <div key={ri} className="whitespace-pre">
              {row.map((cell, ci) => (
                <span key={ci} className={cell.cls}>{cell.c}</span>
              ))}
            </div>
          ))}
        </pre>

        {gameState === 'gameover' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(6, 8, 16, 0.85)', backdropFilter: 'blur(2px)' }}>
            <p className="text-2xl font-bold mb-1" style={{ fontFamily: 'monospace', color: '#f43f5e', textShadow: '0 0 16px rgba(244,63,94,0.7)' }}>
              GAME OVER
            </p>
            <p className="text-sm text-gray-300" style={{ fontFamily: 'monospace' }}>
              Score: <strong style={{ color: '#F7941D' }}>{score}</strong>
              {score >= best && score > 0 && <span style={{ color: '#06b6d4' }}> · NUEVO RÉCORD ⚡</span>}
            </p>
            <p className="text-[10px] text-gray-400 mt-2" style={{ fontFamily: 'monospace' }}>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10">R</kbd> reintentar
            </p>
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-orange-500/20 text-center">
        <p className="text-[9px] text-gray-500" style={{ fontFamily: 'monospace' }}>
          Click acá para enfocar · ESC para volver al chat
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

function randomFreeCell(snake: Pos[]): Pos {
  let p: Pos;
  do {
    p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some((s) => s.x === p.x && s.y === p.y));
  return p;
}
