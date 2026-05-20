'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  onTypingChange?: (typing: boolean) => void;
  isStreaming?: boolean;
  onStop?: () => void;
  /** Handler para enviar archivo + (opcional) texto del usuario. */
  onAttach?: (file: File, message?: string) => void;
}

// ════════════════════════════════════════
// SPEECH RECOGNITION — Web Speech API
// ════════════════════════════════════════
type SpeechRecognitionLike = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: { isFinal: boolean; 0: { transcript: string } }[]; resultIndex: number }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onstart: (() => void) | null;
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
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const dictateBaseTextRef = useRef<string>('');

  useEffect(() => {
    setSpeechSupported(getSpeechRecognition() !== null);
  }, []);

  // Auto-clear del error de dictado tras 5 segundos
  useEffect(() => {
    if (!speechError) return;
    const t = setTimeout(() => setSpeechError(null), 5000);
    return () => clearTimeout(t);
  }, [speechError]);

  function handleSend() {
    if (disabled) return;

    // Si hay archivo adjunto → manda archivo (+ texto opcional)
    if (attachedFile && onAttach) {
      onAttach(attachedFile, text.trim() || undefined);
      setAttachedFile(null);
      setText('');
      onTypingChange?.(false);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      if (listening) stopDictation();
      return;
    }

    // Texto normal
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
    onTypingChange?.(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
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
  // DICTADO POR VOZ — con error handling visible
  // ════════════════════════════════════════
  function startDictation() {
    setSpeechError(null);
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setSpeechError('Tu navegador no soporta dictado por voz. Usa Chrome o Edge.');
      return;
    }
    // Si ya hay sesión activa, abortar primero
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    // es-419 = español Latam universal — funciona mejor que es-PR en Chrome
    rec.lang = 'es-419';
    dictateBaseTextRef.current = text;

    rec.onstart = () => {
      setListening(true);
      setSpeechError(null);
    };

    rec.onresult = (e) => {
      let interim = '';
      let finalAccum = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalAccum += transcript;
        else interim += transcript;
      }
      if (finalAccum) {
        dictateBaseTextRef.current = (dictateBaseTextRef.current + ' ' + finalAccum).trim();
        setText(dictateBaseTextRef.current);
        onTypingChange?.(dictateBaseTextRef.current.length > 0);
      } else if (interim) {
        const next = (dictateBaseTextRef.current + ' ' + interim).trim();
        setText(next);
        onTypingChange?.(next.length > 0);
      }
      requestAnimationFrame(handleInput);
    };

    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    rec.onerror = (e) => {
      setListening(false);
      recognitionRef.current = null;
      // Mapear errores comunes a mensajes claros
      const errorMessages: Record<string, string> = {
        'not-allowed': '🎙 Permite el micrófono en Chrome (candado arriba a la izquierda).',
        'audio-capture': '🎙 No detecto micrófono conectado.',
        'no-speech': '🎙 No escuché nada — intenta de nuevo.',
        'network': '🎙 Problema de red — verifica internet.',
        'aborted': '',
        'language-not-supported': '🎙 Tu navegador no soporta español. Cambia a Chrome.',
      };
      const msg = errorMessages[e.error] ?? `🎙 Error: ${e.error}`;
      if (msg) setSpeechError(msg);
    };

    try {
      rec.start();
      recognitionRef.current = rec;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'no se pudo iniciar';
      setSpeechError(`🎙 ${msg}. Intenta de nuevo.`);
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
  // ATTACH — el archivo NO se envía hasta que el user dé enviar/Enter
  // ════════════════════════════════════════
  function handleAttachClick() {
    fileInputRef.current?.click();
  }
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }
  function removeAttachment() {
    setAttachedFile(null);
  }

  return (
    <div className="px-4 py-4 safe-bottom">
      <div className="max-w-3xl mx-auto">
        {/* Mensaje de error del dictado (visible si aplica) */}
        {speechError && (
          <div className="max-w-3xl mx-auto mb-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200">
            {speechError}
          </div>
        )}

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
            className={`relative flex flex-col rounded-2xl px-3 py-3 backdrop-blur-md border-2 transition-all duration-300 ${
              focused
                ? 'border-[#F7941D]/60 bg-white/90 dark:bg-[#0f1c2e]/90'
                : 'border-white/40 dark:border-white/10 bg-white/70 dark:bg-[#0f1c2e]/70'
            }`}
          >
            {/* Chip del archivo adjunto (estilo GPT) */}
            {attachedFile && (
              <div className="mb-2 flex items-center gap-2 self-start px-3 py-1.5 rounded-lg border" style={{ background: 'rgba(247,148,29,0.08)', borderColor: 'rgba(247,148,29,0.3)' }}>
                <span style={{ color: '#F7941D' }}>
                  {attachedFile.type === 'application/pdf' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  )}
                </span>
                <span className="text-xs font-medium text-[#1B3A5C] dark:text-gray-100 truncate max-w-[260px]">
                  {attachedFile.name}
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  {Math.round(attachedFile.size / 1024)} KB
                </span>
                <button
                  onClick={removeAttachment}
                  className="text-gray-400 hover:text-red-500 cursor-pointer ml-1"
                  aria-label="Quitar archivo"
                  title="Quitar archivo"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            )}

            <div className="flex gap-2 items-end">
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
                    disabled={disabled || isStreaming || !!attachedFile}
                    className="text-gray-500 hover:text-[#F7941D] disabled:opacity-40 disabled:cursor-not-allowed transition-colors w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F7941D]/10 cursor-pointer flex-shrink-0"
                    aria-label="Adjuntar factura LUMA (foto o PDF)"
                    title="Subir factura LUMA (foto o PDF)"
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
                  title={listening ? 'Detener dictado' : 'Dictar por voz — habla al micrófono'}
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
                placeholder={
                  listening
                    ? '🎙 Escuchando... habla normal'
                    : attachedFile
                      ? 'Agrega un mensaje opcional o presiona enviar...'
                      : 'Pregúntame lo que necesites...'
                }
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
                  disabled={disabled || (!text.trim() && !attachedFile)}
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
        </div>

        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-2">
          {listening
            ? '🔴 Dictando — click el botón rojo para parar'
            : attachedFile
              ? 'Archivo adjunto — escribe un mensaje opcional o presiona enviar'
              : 'Enter para enviar · Shift+Enter para nueva línea'}
        </p>
      </div>
    </div>
  );
}
