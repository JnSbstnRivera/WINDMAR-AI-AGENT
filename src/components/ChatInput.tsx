import { useState, useRef } from 'react';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  onTypingChange?: (typing: boolean) => void;
}

export function ChatInput({ onSend, disabled, onTypingChange }: Props) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
    onTypingChange?.(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }

  return (
    <div className="px-4 py-4">
      <div className="max-w-3xl mx-auto">
        {/* Wrapper con glassmorphism + glow */}
        <div
          className="relative rounded-2xl transition-all duration-300"
          style={{
            // Glow naranja sutil que se intensifica al enfocar
            boxShadow: focused
              ? '0 0 0 3px rgba(247,148,29,0.18), 0 12px 40px rgba(247,148,29,0.25), 0 4px 16px rgba(0,0,0,0.08)'
              : '0 8px 32px rgba(247,148,29,0.10), 0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          {/* Halo de fondo sutil para el glassmorphism */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 30% 50%, rgba(247,148,29,0.08), transparent 70%)',
            }}
          />

          <div
            className={`relative flex gap-2 items-end rounded-2xl px-4 py-3 backdrop-blur-md border-2 transition-all duration-300 ${
              focused
                ? 'border-[#F7941D]/60 bg-white/90 dark:bg-[#0f1c2e]/90'
                : 'border-white/40 dark:border-white/10 bg-white/70 dark:bg-[#0f1c2e]/70'
            }`}
          >
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                onTypingChange?.(e.target.value.length > 0);
              }}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              disabled={disabled}
              placeholder="Pregúntame lo que necesites..."
              rows={1}
              className="flex-1 resize-none bg-transparent text-[15px] text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed py-2"
              style={{ minHeight: '44px', maxHeight: '140px' }}
            />
            <button
              onClick={handleSend}
              disabled={disabled || !text.trim()}
              className="bg-gradient-to-br from-[#F7941D] to-[#e8830d] hover:from-[#e8830d] hover:to-[#d97700] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl w-11 h-11 flex items-center justify-center transition-all flex-shrink-0 cursor-pointer shadow-md hover:shadow-lg active:scale-95"
              aria-label="Enviar"
              style={{
                boxShadow: '0 4px 12px rgba(247,148,29,0.4)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Hint pequeño debajo */}
        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-2">
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
}
