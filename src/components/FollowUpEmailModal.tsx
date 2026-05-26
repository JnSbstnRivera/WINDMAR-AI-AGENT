'use client';

import { useState, useEffect, useRef } from 'react';

interface Props {
  /** Nombre del asesor — para personalizar la firma del preview */
  asesorName: string;
  /** Cierra el modal sin enviar */
  onClose: () => void;
  /** Callback cuando el correo se envió exitosamente — recibe to+name para insertar mensaje confirmación en el chat */
  onSent: (to: string, name: string) => void;
}

type Status = 'idle' | 'sending' | 'sent' | 'error';

/**
 * Modal de correo de seguimiento.
 * Form simple: nombre cliente + correo cliente → POST /api/email/send.
 * El correo sale del Outlook del asesor (Microsoft Graph) y queda en /Enviados.
 *
 * UX:
 *  - ESC cierra
 *  - Enter en el último input envía
 *  - Tras enviar, muestra ✓ verde 1.5s y auto-cierra
 *  - Si falla, mensaje rojo persistente con detalle
 */
export function FollowUpEmailModal({ asesorName, onClose, onSent }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus inicial en el primer input
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // ESC para cerrar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status !== 'sending') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, status]);

  const canSubmit =
    name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    status !== 'sending';

  async function handleSubmit() {
    if (!canSubmit) return;
    setStatus('sending');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email.trim(), name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Algo falló al enviar el correo');
        return;
      }
      setStatus('sent');
      // Auto-cerrar tras 1.5s y notificar al chat
      setTimeout(() => {
        onSent(email.trim(), name.trim());
        onClose();
      }, 1500);
    } catch (err) {
      console.error('[FollowUpEmailModal] fetch falló:', err);
      setStatus('error');
      setErrorMsg('Error de conexión. Verifica tu internet.');
    }
  }

  // Preview del correo — refleja la plantilla del backend
  const previewName = name.trim() || '[nombre del cliente]';
  const previewAsesor = asesorName || 'tú';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        // Click fuera del modal cierra (solo si no está enviando)
        if (e.target === e.currentTarget && status !== 'sending') onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-2xl border-2 border-[#F7941D]/40 overflow-hidden"
        style={{
          boxShadow: '0 0 40px rgba(247, 148, 29, 0.3), 0 25px 50px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F7941D]/20 bg-gradient-to-r from-[#F7941D]/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#F7941D]/20 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F7941D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-10 5L2 7" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-[#1B3A5C] dark:text-white text-base leading-tight">
                Correo de seguimiento
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                Se envía desde tu Outlook
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={status === 'sending'}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Cerrar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#1B3A5C] dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Nombre del cliente
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={status === 'sending' || status === 'sent'}
                placeholder="Ej. María González"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0a1628] text-[#1B3A5C] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]/50 focus:border-[#F7941D] transition-all disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1B3A5C] dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Correo del cliente
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSubmit) handleSubmit();
                }}
                disabled={status === 'sending' || status === 'sent'}
                placeholder="cliente@correo.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0a1628] text-[#1B3A5C] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]/50 focus:border-[#F7941D] transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Preview del correo */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0a1628]/50 p-4">
            <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-2 flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Vista previa
            </div>
            <div className="text-[13px] text-[#1B3A5C] dark:text-gray-200 leading-relaxed space-y-2">
              <p className="font-semibold text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-1.5 mb-2">
                Asunto: Seguimiento — Windmar Home
              </p>
              <p>
                Hola <strong>{previewName}</strong>,
              </p>
              <p>
                ¿Cómo estás? Te escribo de <strong>Windmar Home</strong> para saber si todavía sigues interesado en lo que conversamos.
              </p>
              <p>Si quieres, dime cuándo te queda bien y conversamos para aclarar cualquier duda que tengas.</p>
              <p>¡Quedo pendiente!</p>
              <div className="pt-2 text-xs text-gray-600 dark:text-gray-400">
                Saludos,<br />
                <strong className="text-[#1B3A5C] dark:text-white">{previewAsesor}</strong>
                <br />
                <span className="text-[10px]">Windmar Home Puerto Rico</span>
              </div>
            </div>
          </div>

          {/* Mensaje de error */}
          {status === 'error' && errorMsg && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Mensaje de éxito */}
          {status === 'sent' && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2 font-semibold">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              ¡Correo enviado! Revisa tu carpeta Enviados.
            </div>
          )}
        </div>

        {/* Footer con botón principal */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0a1628]/30">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full px-4 py-3 rounded-lg font-semibold text-sm text-white transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            style={{
              background: canSubmit
                ? 'linear-gradient(135deg, #F7941D 0%, #e8830d 100%)'
                : 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
              boxShadow: canSubmit ? '0 4px 14px rgba(247, 148, 29, 0.4)' : 'none',
              opacity: canSubmit ? 1 : 0.5,
            }}
          >
            {status === 'sending' ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                  <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Enviando…
              </>
            ) : status === 'sent' ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Enviado
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                Enviar desde mi Outlook
              </>
            )}
          </button>
          <p className="text-[10px] text-center text-gray-500 dark:text-gray-500 mt-2">
            El correo quedará en tu carpeta <strong>Enviados</strong> de Outlook
          </p>
        </div>
      </div>
    </div>
  );
}
