'use client';

import { useState, useEffect, useRef, useMemo, type JSX } from 'react';
import {
  EMAIL_TEMPLATES,
  renderTemplate,
  renderCustomEmail,
  templateBodyToPlainText,
  type EmailTemplate,
  type EmailExtraField,
} from '@/lib/email-templates';

// ════════════════════════════════════════
// ICONOS VECTOR (estilo Lucide — línea fina, no emojis)
// ════════════════════════════════════════
// Un SVG por plantilla, todos comparten el mismo strokeWidth para armonía
// visual. Color se hereda de currentColor para adaptarse al estado (naranja
// si selected, gris si no).
const ICON_STROKE = 1.7;
const TEMPLATE_ICONS: Record<string, JSX.Element> = {
  // message-circle — conversación / seguimiento
  general: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  // file-text — documento con líneas (pedir documentos)
  documents: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  // phone-missed — llamada con X arriba
  missed_call: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round">
      <line x1="23" y1="1" x2="17" y2="7" />
      <line x1="17" y1="1" x2="23" y2="7" />
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  // calendar-check — cita confirmada
  appointment: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <polyline points="9 16 11 18 15 14" />
    </svg>
  ),
  // send — flecha papel enviar (documento)
  send_document: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  // file-dollar / receipt — cotización (factura/recibo con número)
  send_quote: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  ),
  // sparkles — bienvenida (sutil, no fiesta)
  welcome: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  ),
};

interface Props {
  /** Nombre formal del asesor (Juan Rivera) — del SSO de Microsoft */
  asesorName: string;
  /** Correo corporativo del asesor — para la firma */
  asesorEmail: string;
  /** Cargo formateado del asesor (ej: "Asesor de soluciones / Ventas") */
  asesorCargo?: string;
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
export function FollowUpEmailModal({ asesorName, asesorEmail, asesorCargo, onClose, onSent }: Props) {
  const [templateId, setTemplateId] = useState<string>(EMAIL_TEMPLATES[0].id);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [asesorExt, setAsesorExt] = useState<string>('');
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  // Edición personalizada del texto (para clientes especiales).
  // customBody = null → usar plantilla. string → texto editado por el asesor.
  const [editMode, setEditMode] = useState(false);
  const [customBody, setCustomBody] = useState<string | null>(null);
  const [customSubject, setCustomSubject] = useState<string>('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Click fuera del dropdown lo cierra (no afecta al modal completo)
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

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

  // Reset campos extra cuando cambia la plantilla, precargando defaults.
  // También descarta cualquier edición personalizada (vuelve a plantilla).
  useEffect(() => {
    const initial: Record<string, string> = {};
    if (template.extraFields) {
      for (const f of template.extraFields) {
        initial[f.key] = f.defaultValue || '';
      }
    }
    setExtras(initial);
    setEditMode(false);
    setCustomBody(null);
    setCustomSubject('');
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

  const isCustom = customBody !== null;

  // Algunas plantillas RECOMIENDAN PDF adjunto (ej. cotización porque el
  // cuerpo menciona "revise el PDF adjunto"). Sin embargo NO bloqueamos
  // el envío — el asesor puede mandar sin PDF si edita el texto antes,
  // o si va a mandar el PDF por otro medio (link de OneDrive, etc.).
  const attachmentRecommended = template.requiresAttachment === true;
  const hasAttachment = attachments.length > 0;

  // Si está en modo personalizado, no exigimos los campos extra (ya horneados)
  const canSubmit =
    name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    (isCustom ? customBody!.trim().length > 0 : extrasValid) &&
    status !== 'sending';

  // Render del preview en vivo
  const previewName = name.trim() || '[nombre del cliente]';
  const previewAsesor = asesorName || 'tú';
  const previewEmail = asesorEmail || 'asesor@windmarhome.com';
  // El preview usa el cuerpo personalizado si existe, sino la plantilla
  const { subject: previewSubject, html: previewHtml } = isCustom
    ? renderCustomEmail({
        subject: customSubject || template.subject,
        bodyText: customBody!,
        asesorName: previewAsesor,
        asesorEmail: previewEmail,
        asesorCargo: asesorCargo,
        asesorExt: asesorExt || undefined,
      })
    : renderTemplate(template, {
        name: previewName,
        asesorName: previewAsesor,
        asesorEmail: previewEmail,
        asesorCargo: asesorCargo,
        asesorExt: asesorExt || undefined,
        extras,
      });

  // Activa el modo edición: inicializa el cuerpo custom con el texto de la
  // plantilla actual (placeholders resueltos), listo para personalizar.
  function startEditing() {
    if (customBody === null) {
      const plainBody = templateBodyToPlainText(template, {
        name: name.trim() || '[nombre del cliente]',
        extras,
      });
      setCustomBody(plainBody);
      setCustomSubject(template.subject);
    }
    setEditMode(true);
  }

  // Descarta la edición y vuelve a la plantilla original
  function restoreTemplate() {
    setCustomBody(null);
    setCustomSubject('');
    setEditMode(false);
  }

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
      // Validar tamaño individual (límite de Microsoft Graph para inline)
      if (file.size > MAX_FILE_SIZE) {
        const mb = (file.size / 1024 / 1024).toFixed(1);
        setAttachError(
          `"${file.name}" pesa ${mb}MB — excede el límite de 3MB de Microsoft Graph. Compríme­lo en tinypdf.com o ilovepdf.com (suelen reducir 50-80%).`
        );
        return;
      }
      // Validar tamaño total acumulado
      if (runningTotal + file.size > MAX_TOTAL_SIZE) {
        setAttachError(
          'Los archivos suman más de 4MB en total. Quita alguno o usa un link de OneDrive en el cuerpo del correo.'
        );
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
          // Cuerpo personalizado (si el asesor editó el texto)
          customBody: isCustom ? customBody : undefined,
          customSubject: isCustom ? customSubject : undefined,
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
        className="relative w-full max-w-7xl max-h-[92vh] flex flex-col bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-2xl border-2 border-[#F7941D]/40 overflow-hidden my-auto"
        style={{
          boxShadow: '0 0 40px rgba(247, 148, 29, 0.3), 0 25px 50px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header — siempre visible (flex-shrink-0) */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-[#F7941D]/20 bg-gradient-to-r from-[#F7941D]/10 to-transparent">
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

        {/* Selector de plantillas — dropdown transparente con iconos vector
            (flex-shrink-0 para que NO se haga scroll de esta sección) */}
        <div className="flex-shrink-0 px-5 pt-4 pb-2">
          <label className="block text-xs font-semibold text-[#1B3A5C] dark:text-gray-300 mb-2 uppercase tracking-wider">
            Elige una plantilla
          </label>
          <div className="relative" ref={dropdownRef}>
            {/* Trigger del dropdown */}
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              disabled={disabled}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg border transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 group"
              style={{
                borderColor: dropdownOpen ? '#F7941D' : 'rgba(156, 163, 175, 0.4)',
                background: dropdownOpen
                  ? 'linear-gradient(135deg, rgba(247,148,29,0.08) 0%, transparent 100%)'
                  : 'transparent',
                boxShadow: dropdownOpen ? '0 0 14px rgba(247,148,29,0.18)' : 'none',
              }}
            >
              <span className="w-5 h-5 flex-shrink-0 text-[#F7941D]">
                {TEMPLATE_ICONS[template.id]}
              </span>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-[#1B3A5C] dark:text-white truncate">
                  {template.label}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate italic">
                  {template.description}
                </p>
              </div>
              {/* Chevron — rota cuando abierto */}
              <svg
                className="w-4 h-4 text-gray-400 transition-transform flex-shrink-0"
                style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Panel del dropdown — transparente con backdrop blur, dark-mode aware */}
            {dropdownOpen && (
              <div
                className="absolute z-20 mt-1.5 w-full rounded-lg overflow-hidden bg-white/75 dark:bg-[#0f1c2e]/85 border border-[#F7941D]/35"
                style={{
                  backdropFilter: 'blur(14px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(14px) saturate(180%)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25), 0 0 22px rgba(247, 148, 29, 0.18)',
                  animation: 'wmDropdownIn 160ms cubic-bezier(0.34, 1.15, 0.55, 1) both',
                }}
              >
                {EMAIL_TEMPLATES.map((t) => {
                  const selected = templateId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTemplateId(t.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 transition-colors cursor-pointer text-left border-b last:border-b-0 border-gray-200/30 dark:border-white/5 ${
                        selected
                          ? 'bg-gradient-to-r from-[#F7941D]/20 to-[#F7941D]/5'
                          : 'hover:bg-[#F7941D]/10 dark:hover:bg-[#F7941D]/12'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 flex-shrink-0 ${
                          selected ? 'text-[#F7941D]' : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {TEMPLATE_ICONS[t.id]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold truncate ${
                            selected
                              ? 'text-[#F7941D]'
                              : 'text-[#1B3A5C] dark:text-white'
                          }`}
                        >
                          {t.label}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                          {t.description}
                        </p>
                      </div>
                      {/* Check sutil cuando está seleccionada */}
                      {selected && (
                        <svg
                          className="w-4 h-4 flex-shrink-0 text-[#F7941D]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Body — layout horizontal con formulario angosto y preview elástico.
            COL IZQUIERDA (320px fijo): formulario (4-5 filas compactas)
            COL DERECHA (1fr elástico): preview/editor — el protagonista visual.
            En móvil (< lg) vuelve a columna única.
            min-h-0 + sin overflow: el body NO scrollea como bloque. Cada
            columna maneja su propio scroll internamente cuando lo necesita.
            Solo la VISTA PREVIA del correo scrollea; el resto permanece fijo. */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 px-5 pb-5 pt-2 overflow-hidden">

          {/* ═══════════════ COLUMNA IZQUIERDA — FORMULARIO ═══════════════
              overflow-y-auto solo de esta columna (si el form crece mucho
              con extras o muchos adjuntos); en uso normal no scrollea. */}
          <div className="space-y-4 min-h-0 overflow-y-auto pr-1">
          {/* Inputs base — cada campo en su propia fila (apilados verticalmente)
              para mayor claridad. En la columna de 320px, esto da más aire
              al input y se lee mejor el label. */}
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
                  // Enter submitea si todo es válido. canSubmit ya valida
                  // campos extra requeridos, así que no hay que bloquear
                  // según template.extraFields.length.
                  if (e.key === 'Enter' && canSubmit) handleSubmit();
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

          {/* Campos extra dinámicos por plantilla — se ocultan en modo edición
              porque sus valores ya quedaron horneados en el texto personalizado.
              Cada campo en su propia fila (apilados verticalmente) para
              consistencia con el resto del formulario. */}
          {!isCustom && template.extraFields && template.extraFields.length > 0 && (
            <div className="space-y-3 p-3.5 rounded-lg bg-[#F7941D]/5 border border-[#F7941D]/20">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-[#F7941D]">
                ✨ Detalles para esta plantilla
              </p>
              <div className="space-y-3">
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

            {/* Aviso sutil si la plantilla recomienda adjunto y no hay.
                NO bloquea el envío — solo advierte que el texto menciona PDF.
                El asesor puede enviar igual (compartir el PDF por otro medio)
                o editar el cuerpo con "Editar texto" para quitar la mención. */}
            {attachmentRecommended && !hasAttachment && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-2.5 py-2 text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>
                  <strong>Sin PDF adjunto.</strong> El cuerpo del correo menciona &quot;PDF adjunto&quot; — si vas a enviar el documento por otro medio, edita el texto con el botón <strong>&quot;Editar texto&quot;</strong> antes de enviar.
                </span>
              </div>
            )}
          </div>

          </div>
          {/* ═══════════════ COLUMNA DERECHA — PREVIEW / EDITOR ═══════════════
              flex-col + min-h-0 → el preview/editor adentro toma el alto
              disponible y SOLO ÉL scrollea internamente. */}
          <div className="flex flex-col min-h-0 gap-3 lg:border-l lg:border-gray-200 lg:dark:border-gray-700 lg:pl-5">

          {/* Barra de acciones del preview: vista previa ↔ editar (fija arriba) */}
          <div className="flex-shrink-0 flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1.5">
              {editMode ? (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                  Editando texto
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Vista previa
                  {isCustom && (
                    <span className="ml-1 normal-case tracking-normal text-[#F7941D] font-bold">· personalizado</span>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Botón restaurar — solo si hay edición personalizada */}
              {isCustom && (
                <button
                  type="button"
                  onClick={restoreTemplate}
                  disabled={disabled}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                  title="Descartar cambios y volver a la plantilla original"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  Restaurar
                </button>
              )}

              {/* Botón toggle editar / vista previa */}
              <button
                type="button"
                onClick={() => (editMode ? setEditMode(false) : startEditing())}
                disabled={disabled}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-[#F7941D] hover:bg-[#F7941D]/10 rounded-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {editMode ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Ver vista previa
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                    Editar texto
                  </>
                )}
              </button>
            </div>
          </div>

          {/* MODO EDICIÓN: asunto + cuerpo editables */}
          {editMode ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Asunto
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0a1628] text-[#1B3A5C] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]/50 focus:border-[#F7941D] transition-all disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Cuerpo del mensaje
                </label>
                <textarea
                  value={customBody ?? ''}
                  onChange={(e) => setCustomBody(e.target.value)}
                  disabled={disabled}
                  rows={10}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0a1628] text-[#1B3A5C] dark:text-white text-[13px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#F7941D]/50 focus:border-[#F7941D] transition-all disabled:opacity-50 resize-y min-h-[180px] font-sans"
                />
                <p className="text-[10px] text-gray-400 italic mt-1">
                  La firma de Windmar se agrega automáticamente al final. Deja una línea en blanco para separar párrafos.
                </p>
              </div>
            </div>
          ) : (
            /* VISTA PREVIA del correo renderizado — alto contraste para
               que el texto NO se confunda con el fondo del modal.
               El bloque del ASUNTO se destaca como una "card" prominente.
               flex-1 + overflow-y-auto: ÚNICO bloque scrollable del modal.
               Toma todo el alto disponible y scrollea cuando el cuerpo del
               correo es muy largo. El header (ASUNTO) NO se desplaza
               porque está sticky. */
            <div
              className="flex-1 min-h-0 rounded-lg border-2 border-[#F7941D]/25 bg-white dark:bg-[#0a1628] overflow-y-auto shadow-sm"
              style={{
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
              }}
            >
              {/* Cabecera ASUNTO — card prominente con fondo naranja sutil,
                  icono y tipografía amplia. STICKY arriba: queda visible
                  mientras el asesor scrollea el cuerpo del correo abajo.
                  Dark-mode aware con clases Tailwind + tinte naranja sutil. */}
              <div className="sticky top-0 z-10 px-5 py-4 border-b-2 border-[#F7941D]/30 flex items-start gap-3 backdrop-blur-md bg-gradient-to-br from-[#F7941D]/10 via-white/95 to-white/95 dark:from-[#F7941D]/20 dark:via-[#0a1628]/95 dark:to-[#0a1628]/95">

                <div className="w-9 h-9 rounded-lg bg-[#F7941D]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F7941D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-10 5L2 7" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F7941D] mb-1">
                    Asunto del correo
                  </p>
                  <p className="text-base font-bold text-[#1B3A5C] dark:text-white leading-snug break-words">
                    {previewSubject}
                  </p>
                </div>
              </div>

              {/* CUERPO del correo — el área que más espacio ocupa */}
              <div
                className="px-5 py-5 text-sm text-[#1B3A5C] dark:text-gray-100 leading-relaxed font-medium"
                style={{ wordBreak: 'break-word' }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          )}

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
          {/* ═══════════════ FIN COLUMNAS ═══════════════ */}
        </div>

        {/* Footer — siempre visible con el botón de envío (flex-shrink-0) */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0a1628]/30">
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

  // Textarea SIEMPRE ocupa toda la fila; otros tipos respetan field.fullWidth
  const isFullWidth = field.type === 'textarea' || field.fullWidth;
  const wrapperClass = isFullWidth ? 'md:col-span-2' : '';

  if (field.type === 'textarea') {
    return (
      <div className={wrapperClass}>
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

  if (field.type === 'select') {
    return (
      <div className={wrapperClass}>
        {labelEl}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={commonClass + ' cursor-pointer'}
        >
          <option value="" disabled>
            {field.placeholder || 'Selecciona una opción...'}
          </option>
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
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
