'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Props {
  onClose: () => void;
}

// ════════════════════════════════════════
// WINDMAR SNAKE — Grid CSS con SUN BOT en la cabeza
// ════════════════════════════════════════
// Snake clásico con tema Windmar:
// - Cabeza = SUN BOT happy (imagen)
// - Cuerpo = ▓ naranja
// - Comida = placa solar (▪ cyan)
// - Choca pared o tu cuerpo → game over

const COLS = 28;
const ROWS = 16;
const INITIAL_TICK = 130;
const MIN_TICK = 55;

type Pos = { x: number; y: number };
type Dir = 'up' | 'down' | 'left' | 'right';
type CellKind = 'empty' | 'head' | 'body' | 'food';

export function WindmarSnake({ onClose }: Props) {
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'gameover'>('playing');
  const [grid, setGrid] = useState<CellKind[][]>(() => emptyGrid());

  const snakeRef = useRef<Pos[]>([{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }]);
  const dirRef = useRef<Dir>('right');
  const nextDirRef = useRef<Dir>('right');
  const foodRef = useRef<Pos>({ x: 18, y: 8 });
  const tickRef = useRef<number>(INITIAL_TICK);
  const containerRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    snakeRef.current = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
    dirRef.current = 'right';
    nextDirRef.current = 'right';
    foodRef.current = randomFreeCell(snakeRef.current);
    tickRef.current = INITIAL_TICK;
    setScore(0);
    setGameState('playing');
  }, []);

  useEffect(() => {
    containerRef.current?.focus();
    try {
      const saved = localStorage.getItem('wm-snake-best');
      if (saved) setBest(parseInt(saved, 10));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    function down(e: KeyboardEvent) {
      const k = e.key;
      const cur = dirRef.current;
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

      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
        setGameState('gameover');
        saveBest();
        setGrid(renderFrame());
        timeoutId = setTimeout(step, tickRef.current);
        return;
      }

      if (snakeRef.current.some((seg) => seg.x === head.x && seg.y === head.y)) {
        setGameState('gameover');
        saveBest();
        setGrid(renderFrame());
        timeoutId = setTimeout(step, tickRef.current);
        return;
      }

      snakeRef.current.unshift(head);

      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        setScore((s) => s + 10);
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

  function renderFrame(): CellKind[][] {
    const g = emptyGrid();
    const f = foodRef.current;
    if (g[f.y] && f.x < COLS) g[f.y][f.x] = 'food';
    snakeRef.current.forEach((seg, i) => {
      if (!g[seg.y] || seg.x >= COLS) return;
      g[seg.y][seg.x] = i === 0 ? 'head' : 'body';
    });
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
            🐍 WINDMAR SNAKE
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5" style={{ fontFamily: 'monospace' }}>
            ← ↑ → ↓ mover · come placas (▪) · ESC salir
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
        <span style={{ color: '#06b6d4' }}>BEST: {best}</span>
        <span>LEN: {snakeRef.current.length}</span>
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
                style={{ lineHeight: 1 }}
              >
                {cell === 'head' && (
                  <img
                    src="/sunbot-feliz.png"
                    alt=""
                    style={{
                      width: '160%',
                      height: '160%',
                      objectFit: 'contain',
                      imageRendering: 'pixelated',
                      filter: 'drop-shadow(0 0 10px rgba(247,148,29,0.85))',
                      zIndex: 3,
                    }}
                  />
                )}
                {cell === 'body' && (
                  // Bloque sólido naranja que llena la celda — segmentos
                  // contiguos se conectan visualmente formando una línea continua
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: '#F7941D',
                      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.25), 0 0 4px rgba(247,148,29,0.4)',
                    }}
                  />
                )}
                {cell === 'food' && (
                  // Manzana = círculo cyan brillante (más grande que antes)
                  <div
                    style={{
                      width: '85%',
                      height: '85%',
                      background: 'radial-gradient(circle at 30% 30%, #67e8f9 0%, #06b6d4 60%, #0891b2 100%)',
                      borderRadius: '50%',
                      boxShadow: '0 0 14px rgba(6,182,212,1), 0 0 28px rgba(6,182,212,0.5), inset -2px -3px 4px rgba(0,0,0,0.3)',
                      animation: 'wmPulse 1.4s ease-in-out infinite',
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
              Score: <strong style={{ color: '#F7941D' }}>{score}</strong>
              {score >= best && score > 0 && <span style={{ color: '#06b6d4' }}> · NUEVO RÉCORD ⚡</span>}
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

function randomFreeCell(snake: Pos[]): Pos {
  let p: Pos;
  do {
    p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some((s) => s.x === p.x && s.y === p.y));
  return p;
}
