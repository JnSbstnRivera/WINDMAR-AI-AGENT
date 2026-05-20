'use client';

import { memo } from 'react';

interface Props {
  replies: string[];
  onSelect: (reply: string) => void;
  disabled?: boolean;
}

/**
 * Chips clicables con preguntas de seguimiento sugeridas por el LLM.
 * Se muestran bajo cada mensaje del asistente — click envía la pregunta.
 *
 * El LLM las genera al final de su respuesta dentro de un bloque
 * <quick_replies>...</quick_replies> que el cliente extrae y oculta del texto.
 */
function QuickRepliesImpl({ replies, onSelect, disabled }: Props) {
  if (!replies || replies.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2 wm-fade-in">
      {replies.map((reply, i) => (
        <button
          key={`${i}-${reply}`}
          onClick={() => onSelect(reply)}
          disabled={disabled}
          className="group relative text-[12px] px-3 py-1.5 rounded-full border transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 hover:-translate-y-0.5"
          style={{
            background: 'rgba(247, 148, 29, 0.08)',
            borderColor: 'rgba(247, 148, 29, 0.35)',
            color: '#F7941D',
          }}
        >
          <span className="flex items-center gap-1.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            {reply}
          </span>
        </button>
      ))}
    </div>
  );
}

export const QuickReplies = memo(QuickRepliesImpl, (prev, next) => {
  if (prev.disabled !== next.disabled) return false;
  if (prev.replies.length !== next.replies.length) return false;
  return prev.replies.every((r, i) => r === next.replies[i]);
});
