'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  onTypingChange?: (typing: boolean) => void;
  /** Si true, hay un stream en curso y se muestra botón "detener" en vez de "enviar" */
  isStreaming?: boolean;
  /** Handler para detener el streaming activo (AbortController) */
  onStop?: () => void;
  /** Handler para subir foto/PDF de factura LUMA (opcional). */
  onAttach?: (file: File) => void;
}

// ════════════════════════════════════════
// SPEECH RECOGNITION (Web Speech API)
// ════════════════════════════════════════
// Solo Chrome/Edge/Opera y browsers basados en Chromium tienen soporte real.
// Si no existe, el botón mic no se muestra (feature detection).
type SpeechRecognitionLike = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: { results: { isFinal: boolean; 0: { transcript: string } }[]; resultIndex: number }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function getSpeechRecognition(): { new (): SpeechRecognitionLike } | null {
  if (typeof window === 'undefined') return null;
  const w = window as typeof window & {
    SpeechRecognition?: { new (): SpeechRecognitionLike };
    webkitSpeechRecognition?: { new (): SpeechRecognitionLike };
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function ChatInput({ onSend, disabled, onTypingChange, isStreaming, onStop, onAttach }: Props) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Feature detection — solo mostramos el mic si el browser soporta SpeechRecognition
  useEffect(() => {
    setSpeechSupported(getSpeechRecognition() !== null);
  }, []);

  function handleSend() {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
    onTypingChange?.(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    // Si estaba dictando, paramos al enviar
    if (listening) stopDictation();
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

  function handleFocus() {
    setFocused(true);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setTimeout(() => {
        textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }

  // ════════════════════════════════════════
  // DICTADO POR VOZ
  // ════════════════════════════════════════
  function startDictation() {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'es-PR'; // español Puerto Rico — fallback a es-419 si no existe
    let baseText = text;

    rec.onresult = (e) => {
      let interim = '';
      let finalAccum = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalAccum += transcript;
        else interim += transcript;
      }
      if (finalAccum) {
        baseText = (baseText + ' ' + finalAccum).trim();
        setText(baseText);
        onTypingChange?.(baseText.length > 0);
      } else if (interim) {
        const next = (baseText + ' ' + interim).trim();
        setText(next);
        onTypingChange?.(next.length > 0);
      }
      // Auto-resize del textarea durante dictado
      requestAnimationFrame(handleInput);
    };

    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    try {
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  function stopDictation() {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setListening(false);
  }

  function toggleDictation() {
    if (listening) stopDictation();
    else startDictation();
  }

  // ════════════════════════════════════════
  // ATTACH (foto factura LUMA o PDF)
  // ════════════════════════════════════════
  function handleAttachClick() {
    fileInputRef.current?.click();
  }
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && onAttach) {
      onAttach(file);
    }
    // reset input para permitir subir el mismo archivo dos veces
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="px-4 py-4 safe-bottom">
      <div className="max-w-3xl mx-auto">
        <div
          className="relative rounded-2xl transition-all duration-300"
          style={{
            boxShadow: focused
              ? '0 0 0 3px rgba(247,148,29,0.18), 0 12px 40px rgba(247,148,29,0.25), 0 4px 16px rgba(0,0,0,0.08)'
              : '0 8px 32px rgba(247,148,29,0.10), 0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 30% 50%, rgba(247,148,29,0.08), transparent 70%)',
            }}
          />

          <div
            className={`relative flex gap-2 items-end rounded-2xl px-3 py-3 backdrop-blur-md border-2 transition-all duration-300 ${
              focused
                ? 'border-[#F7941D]/60 bg-white/90 dark:bg-[#0f1c2e]/90'
                : 'border-white/40 dark:border-white/10 bg-white/70 dark:bg-[#0f1c2e]/70'
            }`}
          >
            {/* Botón attach (foto/PDF LUMA) */}
            {onAttach && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={handleAttachClick}
                  disabled={disabled || isStreaming}
                  className="text-gray-500 hover:text-[#F7941D] disabled:opacity-40 disabled:cursor-not-allowed transition-colors w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F7941D]/10 cursor-pointer flex-shrink-0"
                  aria-label="Adjuntar factura LUMA (foto o PDF)"
                  title="Subir factura LUMA (foto o PDF) — el bot calcula el consumo"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                </button>
              </>
            )}

            {/* Botón mic (dictado por voz) */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleDictation}
                disabled={disabled || isStreaming}
                className={`disabled:opacity-40 disabled:cursor-not-allowed transition-colors w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer flex-shrink-0 ${
                  listening
                    ? 'text-white bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'text-gray-500 hover:text-[#F7941D] hover:bg-[#F7941D]/10'
                }`}
                aria-label={listening ? 'Detener dictado' : 'Dictar por voz'}
                title={listening ? 'Detener dictado (click)' : 'Dictar por voz — habla mientras tienes al cliente en línea'}
              >
                {listening ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                )}
              </button>
            )}

            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                onTypingChange?.(e.target.value.length > 0);
              }}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              onFocus={handleFocus}
              onBlur={() => setFocused(false)}
              disabled={disabled}
              placeholder={listening ? '🎙 Escuchando... habla normal' : 'Pregúntame lo que necesites...'}
              rows={1}
              className="flex-1 resize-none bg-transparent text-[15px] text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed py-2"
              style={{ minHeight: '44px', maxHeight: '140px' }}
            />
            {isStreaming && onStop ? (
              <button
                onClick={onStop}
                className="bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl w-11 h-11 flex items-center justify-center transition-all flex-shrink-0 cursor-pointer shadow-md hover:shadow-lg active:scale-95"
                aria-label="Detener generación"
                title="Detener generación"
                style={{ boxShadow: '0 4px 12px rgba(239,68,68,0.4)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={disabled || !text.trim()}
                className="bg-gradient-to-br from-[#F7941D] to-[#e8830d] hover:from-[#e8830d] hover:to-[#d97700] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl w-11 h-11 flex items-center justify-center transition-all flex-shrink-0 cursor-pointer shadow-md hover:shadow-lg active:scale-95"
                aria-label="Enviar"
                style={{ boxShadow: '0 4px 12px rgba(247,148,29,0.4)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-2">
          {listening
            ? '🔴 Dictando — click el botón rojo para parar'
            : 'Enter para enviar · Shift+Enter para nueva línea · 🎙 dictar · 📎 subir factura LUMA'}
        </p>
      </div>
    </div>
  );
}
