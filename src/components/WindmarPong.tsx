'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Props {
  onClose: () => void;
}

// ════════════════════════════════════════
// WINDMAR PONG ASCII — inline en el chat
// ════════════════════════════════════════
// Pong clásico: tú abajo (naranja), IA arriba (cyan).
// Pelota rebota en paredes laterales. Si pasa tu paddle → punto para IA.
// Si pasa el paddle de la IA → punto para ti.
// Primero en llegar a 5 gana.
//
// Controles: ← → mover · ESC salir · R reintentar

const COLS = 32;
const ROWS = 14;
const PADDLE_W = 5;
const WIN_SCORE = 5;
const TICK_MS = 90;

type Cell = { c: string; cls: string };

export function WindmarPong({ onClose }: Props) {
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [grid, setGrid] = useState<Cell[][]>(() => emptyGrid());

  const playerXRef = useRef<number>(Math.floor(COLS / 2 - PADDLE_W / 2));
  const aiXRef = useRef<number>(Math.floor(COLS / 2 - PADDLE_W / 2));
  const ballRef = useRef({ x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2), vx: 1, vy: 1 });
  const keysRef = useRef({ left: false, right: false });
  const containerRef = useRef<HTMLDivElement>(null);

  const resetBall = useCallback((toUp: boolean) => {
    ballRef.current = {
      x: Math.floor(COLS / 2),
      y: Math.floor(ROWS / 2),
      vx: Math.random() < 0.5 ? -1 : 1,
      vy: toUp ? -1 : 1,
    };
  }, []);

  const fullReset = useCallback(() => {
    playerXRef.current = Math.floor(COLS / 2 - PADDLE_W / 2);
    aiXRef.current = Math.floor(COLS / 2 - PADDLE_W / 2);
    resetBall(true);
    setPlayerScore(0);
    setAiScore(0);
    setGameState('playing');
  }, [resetBall]);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // ════════════════════════════════════════
  // CONTROLES
  // ════════════════════════════════════════
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); keysRef.current.left = true; }
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); keysRef.current.right = true; }
      else if (e.key === 'Escape') onClose();
      else if ((e.key === 'r' || e.key === 'R') && gameState !== 'playing') fullReset();
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
  }, [onClose, gameState, fullReset]);

  // ════════════════════════════════════════
  // GAME LOOP
  // ════════════════════════════════════════
  useEffect(() => {
    const id = setInterval(() => {
      if (gameState !== 'playing') {
        setGrid(renderFrame());
        return;
      }

      // Player movement
      if (keysRef.current.left && playerXRef.current > 0) playerXRef.current -= 1;
      if (keysRef.current.right && playerXRef.current < COLS - PADDLE_W) playerXRef.current += 1;

      // IA — sigue la pelota pero con lag (movimiento de 1 por tick, no perfecto)
      const aiCenter = aiXRef.current + Math.floor(PADDLE_W / 2);
      const ballX = ballRef.current.x;
      // Solo se mueve cuando la pelota viene hacia ella (no se anticipa)
      if (ballRef.current.vy < 0) {
        if (ballX < aiCenter && aiXRef.current > 0) aiXRef.current -= 1;
        else if (ballX > aiCenter && aiXRef.current < COLS - PADDLE_W) aiXRef.current += 1;
      }

      // Ball movement
      const ball = ballRef.current;
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Rebote paredes laterales
      if (ball.x <= 0) { ball.x = 0; ball.vx = 1; }
      if (ball.x >= COLS - 1) { ball.x = COLS - 1; ball.vx = -1; }

      // Rebote paddle player (fila ROWS - 1)
      if (ball.y === ROWS - 2 && ball.vy > 0) {
        if (ball.x >= playerXRef.current && ball.x < playerXRef.current + PADDLE_W) {
          ball.vy = -1;
          // Ángulo según posición en el paddle
          const rel = ball.x - playerXRef.current;
          if (rel === 0) ball.vx = -1;
          else if (rel === PADDLE_W - 1) ball.vx = 1;
        }
      }

      // Rebote paddle IA (fila 1)
      if (ball.y === 1 && ball.vy < 0) {
        if (ball.x >= aiXRef.current && ball.x < aiXRef.current + PADDLE_W) {
          ball.vy = 1;
          const rel = ball.x - aiXRef.current;
          if (rel === 0) ball.vx = -1;
          else if (rel === PADDLE_W - 1) ball.vx = 1;
        }
      }

      // Goal IA (pelota pasa al player abajo)
      if (ball.y >= ROWS) {
        setAiScore((s) => {
          const ns = s + 1;
          if (ns >= WIN_SCORE) setGameState('lost');
          return ns;
        });
        resetBall(true);
      }
      // Goal player (pelota pasa al IA arriba)
      if (ball.y < 0) {
        setPlayerScore((s) => {
          const ns = s + 1;
          if (ns >= WIN_SCORE) setGameState('won');
          return ns;
        });
        resetBall(false);
      }

      setGrid(renderFrame());
    }, TICK_MS);
    return () => clearInterval(id);
  }, [gameState, resetBall]);

  function renderFrame(): Cell[][] {
    const g = emptyGrid();
    // Línea central punteada
    for (let x = 0; x < COLS; x += 2) {
      const midY = Math.floor(ROWS / 2);
      if (g[midY]) g[midY][x] = { c: '·', cls: 'text-white/15' };
    }
    // IA paddle (arriba, cyan)
    for (let i = 0; i < PADDLE_W; i++) {
      const x = aiXRef.current + i;
      if (g[0] && x < COLS) g[0][x] = { c: '═', cls: 'text-cyan-400' };
    }
    // Player paddle (abajo, naranja)
    for (let i = 0; i < PADDLE_W; i++) {
      const x = playerXRef.current + i;
      if (g[ROWS - 1] && x < COLS) g[ROWS - 1][x] = { c: '═', cls: 'text-orange-500' };
    }
    // Ball
    const b = ballRef.current;
    if (b.y >= 0 && b.y < ROWS && b.x >= 0 && b.x < COLS) {
      g[b.y][b.x] = { c: '●', cls: 'text-white' };
    }
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
            🏓 WINDMAR PONG
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5" style={{ fontFamily: 'monospace' }}>
            ← → mover · Primer a {WIN_SCORE} gana · ESC salir
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-red-400 cursor-pointer p-1.5" aria-label="Cerrar juego">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="flex justify-between px-4 py-2 border-b border-orange-500/20 text-[14px]" style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>
        <span style={{ color: '#06b6d4' }}>IA: <strong>{aiScore}</strong></span>
        <span style={{ color: '#F7941D' }}>TÚ: <strong>{playerScore}</strong></span>
      </div>

      <div className="relative px-3 py-3 select-none">
        <pre
          className="leading-[1.1] text-center"
          style={{ fontFamily: '"JetBrains Mono", "Courier New", monospace', fontSize: 'clamp(14px, 3vw, 22px)', lineHeight: '1.1', margin: 0 }}
        >
          {grid.map((row, ri) => (
            <div key={ri} className="whitespace-pre">
              {row.map((cell, ci) => (
                <span key={ci} className={cell.cls}>{cell.c}</span>
              ))}
            </div>
          ))}
        </pre>

        {gameState !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(6, 8, 16, 0.85)', backdropFilter: 'blur(2px)' }}>
            <p className="text-2xl font-bold mb-1" style={{ fontFamily: 'monospace', color: gameState === 'won' ? '#10b981' : '#f43f5e', textShadow: `0 0 16px ${gameState === 'won' ? 'rgba(16,185,129,0.7)' : 'rgba(244,63,94,0.7)'}` }}>
              {gameState === 'won' ? '¡GANASTE! 🏆' : 'PERDISTE'}
            </p>
            <p className="text-sm text-gray-300" style={{ fontFamily: 'monospace' }}>
              {playerScore} - {aiScore}
            </p>
            <p className="text-[10px] text-gray-400 mt-2" style={{ fontFamily: 'monospace' }}>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10">R</kbd> revancha
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
