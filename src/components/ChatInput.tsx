'use client';

import { useEffect, useRef, useState } from 'react';

// Tipos mínimos de la Web Speech API (no están en el lib DOM de TS).
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  onTypingChange?: (typing: boolean) => void;
  isStreaming?: boolean;
  onStop?: () => void;
  /** Handler para enviar archivo + (opcional) texto del usuario. */
  onAttach?: (file: File, message?: string) => void;
  /** Abre el modal de correo de seguimiento (atajo, equivale al comando /@). */
  onEmail?: () => void;
}

export function ChatInput({ onSend, disabled, onTypingChange, isStreaming, onStop, onAttach, onEmail }: Props) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef('');

  // ════════════════════════════════════════
  // DICTADO POR VOZ — Web Speech API nativa del navegador (sin Deepgram).
  // Gratis, on-device, soporta español. Mejor en Chrome/Edge (lo que usan
  // los asesores). El texto reconocido cae en el input para editar/enviar.
  // ════════════════════════════════════════
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    setSpeechSupported(true);
    const rec = new SR();
    rec.lang = 'es-US'; // español Puerto Rico/US
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      const base = baseTextRef.current;
      const next = base ? `${base} ${transcript}` : transcript;
      setText(next);
      onTypingChange?.(next.length > 0);
      const el = textareaRef.current;
      if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 140) + 'px'; }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    return () => { try { rec.stop(); } catch { /* noop */ } };
  }, [onTypingChange]);

  function toggleMic() {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
      return;
    }
    baseTextRef.current = text.trim();
    try {
      rec.start();
      setListening(true);
      textareaRef.current?.focus();
    } catch { /* ya iniciado */ }
  }

  function handleSend() {
    if (disabled) return;
    // Si está dictando, detener el micrófono antes de enviar.
    if (listening) { try { recognitionRef.current?.stop(); } catch { /* noop */ } setListening(false); }

    // Si hay archivo adjunto → manda archivo (+ texto opcional)
    if (attachedFile && onAttach) {
      onAttach(attachedFile, text.trim() || undefined);
      setAttachedFile(null);
      setText('');
      onTypingChange?.(false);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      return;
    }

    // Texto normal
    if (!text.trim()) return;
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

  function handleFocus() {
    setFocused(true);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setTimeout(() => {
        textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
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
      <div className="max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto">
        {/* chat-input-glow agrega una estela de luz girando alrededor del
            input (loop 8s) — conic-gradient con colores Windmar (naranja
            + purple + azul) y filter blur para que se sienta suave. */}
        <div
          className="chat-input-glow relative rounded-2xl transition-all duration-300"
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
              {/* Botón de dictado por voz (Web Speech API nativa) */}
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={disabled || isStreaming}
                  className={`disabled:opacity-40 disabled:cursor-not-allowed transition-colors w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer flex-shrink-0 ${
                    listening ? 'text-white bg-red-500 hover:bg-red-600' : 'text-gray-500 hover:text-[#F7941D] hover:bg-[#F7941D]/10'
                  }`}
                  aria-label={listening ? 'Detener dictado' : 'Dictar por voz'}
                  title={listening ? 'Escuchando… toca para detener' : 'Dictar por voz'}
                  style={listening ? { animation: 'micPulse 1.3s ease-in-out infinite' } : undefined}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                  <style>{`@keyframes micPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); } 50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); } }`}</style>
                </button>
              )}

              {/* Botón correo de seguimiento (atajo al modal — equivale a /@) */}
              {onEmail && (
                <button
                  type="button"
                  onClick={onEmail}
                  disabled={disabled}
                  className="text-gray-500 hover:text-[#F7941D] disabled:opacity-40 disabled:cursor-not-allowed transition-colors w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F7941D]/10 cursor-pointer flex-shrink-0"
                  aria-label="Enviar correo de seguimiento al cliente"
                  title="Correo de seguimiento al cliente (busca el lead en Zoho y autocompleta)"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </button>
              )}

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
                    aria-label="Adjuntar documento (foto o PDF)"
                    title="Adjuntar documento (foto o PDF) — factura LUMA, ID, cotización, etc."
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                    </svg>
                  </button>
                </>
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
                  attachedFile
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
          {attachedFile
            ? 'Archivo adjunto — escribe un mensaje opcional o presiona enviar'
            : 'Enter para enviar · Shift+Enter para nueva línea'}
        </p>
      </div>
    </div>
  );
}
