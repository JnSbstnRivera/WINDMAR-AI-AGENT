'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  EMAIL_TEMPLATES,
  renderTemplate,
  type EmailTemplate,
  type EmailExtraField,
} from '@/lib/email-templates';

interface Props {
  /** Nombre formal del asesor (Juan Rivera) — del SSO de Microsoft */
  asesorName: string;
  /** Correo corporativo del asesor — para la firma */
  asesorEmail: string;
  /** Cierra el modal sin enviar */
  onClose: () => void;
  /** Callback cuando el correo se envió exitosamente */
  onSent: (to: string, name: string, templateLabel: string) => void;
}

type Status = 'idle' | 'sending' | 'sent' | 'error';

interface AttachmentFile {
  name: string;
  contentType: string;
  /** base64 sin el prefijo data: */
  contentBytes: string;
  /** Tamaño en bytes (para mostrar y validar) */
  size: number;
}

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
const MAX_TOTAL_SIZE = 4 * 1024 * 1024; // 4MB
const EXT_STORAGE_KEY = 'wh-asesor-extension';

/**
 * Modal de correo de seguimiento con SELECTOR DE PLANTILLAS y CAMPOS EXTRA dinámicos.
 *
 * Flujo:
 *  1. Asesor elige una de 5 plantillas
 *  2. Llena nombre + correo del cliente (siempre requeridos)
 *  3. Llena campos extra si la plantilla los requiere
 *     - documents: textarea para especificar qué pedir
 *     - appointment: fecha + hora
 *     - welcome: producto + consultor
 *  4. Preview se actualiza en vivo
 *  5. POST /api/email/send con { to, name, templateId, extras }
 */
export function FollowUpEmailModal({ asesorName, asesorEmail, onClose, onSent }: Props) {
  const [templateId, setTemplateId] = useState<string>(EMAIL_TEMPLATES[0].id);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [asesorExt, setAsesorExt] = useState<string>('');
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar extensión guardada de localStorage al montar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(EXT_STORAGE_KEY);
      if (saved) setAsesorExt(saved);
    } catch {
      // localStorage puede fallar en algunos contextos — no es crítico
    }
  }, []);

  // Persistir extensión en localStorage cuando cambia
  useEffect(() => {
    try {
      if (asesorExt) localStorage.setItem(EXT_STORAGE_KEY, asesorExt);
      else localStorage.removeItem(EXT_STORAGE_KEY);
    } catch {}
  }, [asesorExt]);

  const template: EmailTemplate = useMemo(
    () => EMAIL_TEMPLATES.find((t) => t.id === templateId) || EMAIL_TEMPLATES[0],
    [templateId]
  );

  // Reset campos extra cuando cambia la plantilla, precargando defaults
  useEffect(() => {
    const initial: Record<string, string> = {};
    if (template.extraFields) {
      for (const f of template.extraFields) {
        initial[f.key] = f.defaultValue || '';
      }
    }
    setExtras(initial);
  }, [template]);

  // Focus inicial
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // ESC cierra
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status !== 'sending') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, status]);

  // Validación: nombre + email + todos los extras requeridos
  const extrasValid = useMemo(() => {
    if (!template.extraFields) return true;
    for (const f of template.extraFields) {
      if (f.required && !(extras[f.key] || '').trim()) return false;
    }
    return true;
  }, [template, extras]);

  const canSubmit =
    name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    extrasValid &&
    status !== 'sending';

  // Render del preview en vivo
  const previewName = name.trim() || '[nombre del cliente]';
  const previewAsesor = asesorName || 'tú';
  const previewEmail = asesorEmail || 'asesor@windmarhome.com';
  const { subject: previewSubject, html: previewHtml } = renderTemplate(template, {
    name: previewName,
    asesorName: previewAsesor,
    asesorEmail: previewEmail,
    asesorExt: asesorExt || undefined,
    extras,
  });

  // Procesa archivos seleccionados: valida tipo/tamaño y los convierte a base64
  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setAttachError(null);

    const currentTotal = attachments.reduce((sum, a) => sum + a.size, 0);
    const newAttachments: AttachmentFile[] = [];
    let runningTotal = currentTotal;

    for (const file of Array.from(files)) {
      // Validar tipo
      if (!ALLOWED_TYPES.includes(file.type)) {
        setAttachError(`"${file.name}" no es un formato permitido (PDF, JPG, PNG).`);
        return;
      }
      // Validar tamaño individual
      if (file.size > MAX_FILE_SIZE) {
        setAttachError(`"${file.name}" excede 3MB. Comprímelo primero.`);
        return;
      }
      // Validar tamaño total acumulado
      if (runningTotal + file.size > MAX_TOTAL_SIZE) {
        setAttachError('Los archivos suman más de 4MB. Quita alguno.');
        return;
      }
      runningTotal += file.size;

      // Leer como base64
      try {
        const base64 = await fileToBase64(file);
        newAttachments.push({
          name: file.name,
          contentType: file.type,
          contentBytes: base64,
          size: file.size,
        });
      } catch (err) {
        console.error('[FollowUpEmailModal] No se pudo leer archivo:', file.name, err);
        setAttachError(`No se pudo leer "${file.name}". Intenta de nuevo.`);
        return;
      }
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    // Reset input para poder volver a seleccionar el mismo archivo
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setAttachError(null);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setStatus('sending');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email.trim(),
          name: name.trim(),
          templateId,
          extras,
          asesorExt: asesorExt.trim() || undefined,
          // Mandamos solo lo que necesita el endpoint (sin el field `size`)
          attachments: attachments.map((a) => ({
            name: a.name,
            contentType: a.contentType,
            contentBytes: a.contentBytes,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Algo falló al enviar el correo');
        return;
      }
      setStatus('sent');
      setTimeout(() => {
        onSent(email.trim(), name.trim(), template.label);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('[FollowUpEmailModal] fetch falló:', err);
      setStatus('error');
      setErrorMsg('Error de conexión. Verifica tu internet.');
    }
  }

  const disabled = status === 'sending' || status === 'sent';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && status !== 'sending') onClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-2xl border-2 border-[#F7941D]/40 overflow-hidden my-auto"
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
                Desde tu Outlook · firma como <strong>{asesorName}</strong>
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

        {/* Selector de plantillas */}
        <div className="px-5 pt-4 pb-2">
          <label className="block text-xs font-semibold text-[#1B3A5C] dark:text-gray-300 mb-2 uppercase tracking-wider">
            Elige una plantilla
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {EMAIL_TEMPLATES.map((t) => {
              const selected = templateId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTemplateId(t.id)}
                  disabled={disabled}
                  className="relative flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border-2 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    borderColor: selected ? '#F7941D' : 'rgba(156, 163, 175, 0.3)',
                    background: selected
                      ? 'linear-gradient(135deg, rgba(247,148,29,0.15) 0%, rgba(247,148,29,0.05) 100%)'
                      : 'transparent',
                    boxShadow: selected ? '0 0 12px rgba(247,148,29,0.25)' : 'none',
                  }}
                  title={t.description}
                >
                  <span className="text-xl leading-none">{t.icon}</span>
                  <span
                    className="text-[10px] font-semibold text-center leading-tight"
                    style={{ color: selected ? '#F7941D' : 'inherit' }}
                  >
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 italic">
            {template.description}
          </p>
        </div>

        {/* Body */}
        <div className="px-5 pb-5 pt-2 space-y-4">
          {/* Inputs base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1B3A5C] dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Nombre del cliente
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={disabled}
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
                  if (e.key === 'Enter' && canSubmit && !template.extraFields?.length) handleSubmit();
                }}
                disabled={disabled}
                placeholder="cliente@correo.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0a1628] text-[#1B3A5C] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]/50 focus:border-[#F7941D] transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Extensión telefónica del asesor — opcional, persiste en localStorage */}
          <div className="flex items-center gap-2 -mt-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">
              Tu extensión
            </span>
            <input
              type="text"
              value={asesorExt}
              onChange={(e) => setAsesorExt(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
              disabled={disabled}
              placeholder="Opcional · Ej. 454"
              maxLength={6}
              className="flex-1 max-w-[180px] px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0a1628] text-[#1B3A5C] dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#F7941D]/50 focus:border-[#F7941D] transition-all disabled:opacity-50"
            />
            <span className="text-[10px] text-gray-400 italic">
              se guarda en tu navegador
            </span>
          </div>

          {/* Campos extra dinámicos por plantilla */}
          {template.extraFields && template.extraFields.length > 0 && (
            <div className="space-y-3 p-3.5 rounded-lg bg-[#F7941D]/5 border border-[#F7941D]/20">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-[#F7941D]">
                ✨ Detalles para esta plantilla
              </p>
              <div className={template.extraFields.length > 1 ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : ''}>
                {template.extraFields.map((field) => (
                  <ExtraFieldInput
                    key={field.key}
                    field={field}
                    value={extras[field.key] || ''}
                    disabled={disabled}
                    onChange={(v) => setExtras((prev) => ({ ...prev, [field.key]: v }))}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Adjuntar archivos (PDF / JPG / PNG, máx 3MB c/u, 4MB total) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[#1B3A5C] dark:text-gray-300 uppercase tracking-wider">
                Adjuntos {attachments.length > 0 && (
                  <span className="text-gray-400 font-normal normal-case ml-1">
                    ({attachments.length} · {formatBytes(attachments.reduce((s, a) => s + a.size, 0))})
                  </span>
                )}
              </label>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                type="button"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-[#F7941D] hover:bg-[#F7941D]/10 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                Adjuntar archivo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
            </div>

            {attachments.length > 0 && (
              <div className="space-y-1.5">
                {attachments.map((att, idx) => (
                  <div
                    key={`${att.name}-${idx}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F7941D]/5 border border-[#F7941D]/20"
                  >
                    {/* Icono según tipo */}
                    <span className="text-base flex-shrink-0">
                      {att.contentType === 'application/pdf' ? '📄' : '🖼️'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#1B3A5C] dark:text-white truncate">
                        {att.name}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {formatBytes(att.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeAttachment(idx)}
                      disabled={disabled}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                      aria-label={`Quitar ${att.name}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {attachError && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-2.5 py-1.5 text-[11px] text-red-700 dark:text-red-300">
                ⚠️ {attachError}
              </div>
            )}

            <p className="text-[10px] text-gray-400 italic">
              PDF, JPG o PNG · máx 3MB por archivo · 4MB total
            </p>
          </div>

          {/* Preview del correo */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0a1628]/50 p-4 max-h-80 overflow-y-auto">
            <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-2 flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Vista previa
            </div>
            <p className="font-semibold text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-1.5 mb-2">
              Asunto: {previewSubject}
            </p>
            <div
              className="text-[13px] text-[#1B3A5C] dark:text-gray-200 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
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

        {/* Footer */}
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

/**
 * Renderiza el input apropiado según el tipo de campo extra.
 * Maneja: text, textarea, date, time.
 */
function ExtraFieldInput({
  field,
  value,
  disabled,
  onChange,
}: {
  field: EmailExtraField;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  const labelEl = (
    <label className="block text-xs font-semibold text-[#1B3A5C] dark:text-gray-300 mb-1.5 uppercase tracking-wider">
      {field.label}
      {field.required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const commonClass =
    'w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0a1628] text-[#1B3A5C] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]/50 focus:border-[#F7941D] transition-all disabled:opacity-50';

  // Render correcto del input según tipo
  if (field.type === 'textarea') {
    return (
      <div className="md:col-span-2">
        {labelEl}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={field.placeholder}
          rows={3}
          className={commonClass + ' resize-y min-h-[80px]'}
        />
      </div>
    );
  }

  return (
    <div>
      {labelEl}
      <input
        type={field.type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={field.placeholder}
        className={commonClass}
      />
    </div>
  );
}

/**
 * Lee un File del navegador y lo convierte a base64 SIN el prefijo "data:...;base64,".
 * Microsoft Graph espera solo los bytes en base64.
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // FileReader devuelve "data:application/pdf;base64,JVBERi0..."
      // Cortamos el prefijo para mandar solo los bytes
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Formatea bytes a "1.2 MB" / "543 KB" / etc. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
