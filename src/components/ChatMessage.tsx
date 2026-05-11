'use client';

import { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '@/types';
import { UserAvatar } from './UserAvatar';
import { useTypewriter } from '@/hooks/useTypewriter';

interface Props {
  message: Message;
  isStreaming?: boolean;
  asesorEmail?: string;
  asesorDisplayName?: string;
  asesorPhotoUrl?: string | null;
  /** Si true Y este mensaje es del asistente, muestra botón "Regenerar" */
  showRegenerate?: boolean;
  onRegenerate?: () => void;
}

function stripForCopy(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1: $2')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[^\S\n]+\n/g, '\n')
    .trim();
}

/**
 * Renderiza contenido del mensaje del asistente con Markdown completo.
 * Soporta: bold, italic, listas (numeradas y bullet), tablas, code blocks,
 * blockquotes, links. Todos los estilos siguen el brand Windmar.
 *
 * Usamos react-markdown + remark-gfm (GitHub Flavored Markdown para tablas).
 * Plain text se renderiza igual; el componente es seguro (no acepta HTML raw).
 */
function renderContent(text: string) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Negritas — color brand azul, peso fuerte
        strong: ({ children }) => (
          <strong className="font-bold text-[#1B3A5C] dark:text-white">{children}</strong>
        ),
        // Itálicas — sutiles, mismo color del cuerpo
        em: ({ children }) => <em className="italic text-gray-700 dark:text-gray-300">{children}</em>,
        // Enlaces — naranja brand, clicables, abren en nueva pestaña
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#F7941D] dark:text-[#F7941D] underline font-semibold hover:text-[#e8830d] transition-colors"
          >
            {children}
          </a>
        ),
        // Listas con bullets — spacing cómodo, padding izquierdo claro
        ul: ({ children }) => <ul className="list-disc list-outside pl-6 my-2 space-y-1">{children}</ul>,
        // Listas numeradas — mismo styling
        ol: ({ children }) => <ol className="list-decimal list-outside pl-6 my-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        // Code inline — fondo gris, monospace, padding pequeño
        code: ({ children, className }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="bg-gray-100 dark:bg-gray-800 text-[#1B3A5C] dark:text-orange-300 px-1.5 py-0.5 rounded text-[0.9em] font-mono">
                {children}
              </code>
            );
          }
          // Code block — pre lo maneja, solo retornamos el code styled
          return <code className={`${className} font-mono text-sm`}>{children}</code>;
        },
        // Code block container — fondo gris oscuro, scroll horizontal si largo
        pre: ({ children }) => (
          <pre className="bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 my-3 overflow-x-auto text-sm">
            {children}
          </pre>
        ),
        // Blockquote — barra naranja brand a la izquierda
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-[#F7941D] pl-4 my-3 italic text-gray-600 dark:text-gray-300">
            {children}
          </blockquote>
        ),
        // Tablas (vía remark-gfm) — bordes sutiles, header destacado
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700 text-sm">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-gray-50 dark:bg-gray-800">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left font-semibold text-[#1B3A5C] dark:text-white">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">{children}</td>
        ),
        // Headers — sutiles, no gigantes (el prompt los prohíbe pero por si llegan)
        h1: ({ children }) => <h1 className="text-lg font-bold text-[#1B3A5C] dark:text-white mt-3 mb-1">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-bold text-[#1B3A5C] dark:text-white mt-3 mb-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-bold text-[#1B3A5C] dark:text-white mt-2 mb-1">{children}</h3>,
        // Separador horizontal — sutil, gris (el prompt los prohíbe pero por si llegan)
        hr: () => <hr className="my-3 border-gray-200 dark:border-gray-700" />,
        // Párrafo — sin margin top exagerado (se ve mejor en chat)
        p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

function IAAvatar({ isStreaming, isError }: { isStreaming?: boolean; isError?: boolean }) {
  const src = isError
    ? '/sunbot-error.png'
    : isStreaming
      ? '/sunbot-pensando.png'
      : '/sunbot-feliz.png';

  return (
    <div className="relative flex-shrink-0" style={{ width: 40, height: 40 }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            isError
              ? 'radial-gradient(circle, rgba(220,80,80,0.55) 0%, rgba(220,80,80,0.15) 50%, transparent 75%)'
              : 'radial-gradient(circle, rgba(247,148,29,0.55) 0%, rgba(247,148,29,0.15) 50%, transparent 75%)',
          filter: 'blur(8px)',
          animation: isStreaming ? 'avatarPulse 1.4s ease-in-out infinite' : undefined,
        }}
      />
      <img
        src={src}
        alt="Windmar AI"
        className="mascot-img relative z-10 w-10 h-10 object-contain transition-opacity duration-300"
        style={{ imageRendering: 'pixelated' }}
      />
      <style>{`
        @keyframes avatarPulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%       { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

function ChatMessageImpl({
  message,
  isStreaming,
  asesorEmail = '',
  asesorDisplayName,
  asesorPhotoUrl,
  showRegenerate,
  onRegenerate,
}: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  async function handleCopy() {
    await navigator.clipboard.writeText(stripForCopy(message.content));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 mb-6">
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[80%]">
          <div
            className="text-white rounded-2xl px-5 sm:px-6 py-4 text-[15px] leading-relaxed"
            style={{
              background: 'linear-gradient(135deg, #1B3A5C 0%, #2a5a8c 100%)',
              boxShadow: '0 6px 20px rgba(27,58,92,0.25), 0 2px 6px rgba(27,58,92,0.15)',
            }}
          >
            {message.content}
          </div>
        </div>
        <UserAvatar
          email={asesorEmail}
          displayName={asesorDisplayName}
          photoUrl={asesorPhotoUrl}
          size={40}
        />
      </div>
    );
  }

  const isErrorMessage = message.content.includes('[ERROR_TYPE:');
  const cleanContent = message.content.replace(/\n*\[ERROR_TYPE:[^\]]+\]/g, '');

  // Typewriter effect: durante streaming, mostramos el texto carácter por carácter
  // a velocidad uniforme adaptativa. Aunque Anthropic mande chunks en bloques
  // grandes (típico cuando hay throttling de TPM), el usuario percibe flujo CONSTANTE.
  const typedContent = useTypewriter(cleanContent, !!isStreaming);
  const displayContent = isStreaming ? typedContent : cleanContent;

  // Loading skeleton: si el mensaje está en streaming pero AÚN no llega texto,
  // mostramos tres dots animados. Le da al asesor confirmación inmediata de que
  // la IA está "pensando" (resuelve el "vacío" de los primeros 300-500ms / TTFT).
  const showSkeleton = isStreaming && cleanContent.length === 0;

  return (
    <div className="flex justify-start gap-3 mb-8">
      <IAAvatar isStreaming={isStreaming} isError={isErrorMessage} />
      <div className="flex flex-col items-start min-w-0 flex-1 pt-1.5">
        <div className="text-[15px] sm:text-[15.5px] text-gray-800 dark:text-gray-100 leading-relaxed w-full break-words">
          {showSkeleton ? (
            <span className="inline-flex items-center gap-1.5 py-1" aria-label="Generando respuesta">
              <span className="w-2 h-2 rounded-full bg-[#F7941D]" style={{ animation: 'wmDotBounce 1.2s ease-in-out 0s infinite' }} />
              <span className="w-2 h-2 rounded-full bg-[#F7941D]" style={{ animation: 'wmDotBounce 1.2s ease-in-out 0.2s infinite' }} />
              <span className="w-2 h-2 rounded-full bg-[#F7941D]" style={{ animation: 'wmDotBounce 1.2s ease-in-out 0.4s infinite' }} />
              <style>{`
                @keyframes wmDotBounce {
                  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
                  40%            { transform: translateY(-4px); opacity: 1; }
                }
              `}</style>
            </span>
          ) : (
            <>
              {renderContent(displayContent)}
              {isStreaming && (
                <span className="inline-block w-[2px] h-[14px] bg-[#F7941D] ml-1 align-middle animate-pulse" />
              )}
            </>
          )}
        </div>

        {!isStreaming && message.content && (
          <div className="mt-3 flex items-center gap-4">
            <button
              onClick={handleCopy}
              className="text-xs text-gray-400 hover:text-[#F7941D] dark:hover:text-[#F7941D] transition-colors flex items-center gap-1 cursor-pointer"
            >
              {copied ? '✓ Copiado' : '⎘ Copiar para WhatsApp'}
            </button>
            {showRegenerate && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="text-xs text-gray-400 hover:text-[#F7941D] dark:hover:text-[#F7941D] transition-colors flex items-center gap-1 cursor-pointer"
                title="Generar otra respuesta a la misma pregunta"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/>
                  <polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                <span>Regenerar</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ChatMessage memoizado. Re-renderiza SOLO cuando cambia contenido, streaming,
 * o el avatar del asesor — NO cuando llegan chunks de OTROS mensajes.
 *
 * Esto es crítico durante streaming: sin memo, cada chunk del último mensaje
 * dispara re-render de TODOS los mensajes anteriores, lo que se siente
 * "pausado" en conversaciones largas.
 */
export const ChatMessage = memo(ChatMessageImpl, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.isStreaming === next.isStreaming &&
    prev.asesorEmail === next.asesorEmail &&
    prev.asesorDisplayName === next.asesorDisplayName &&
    prev.asesorPhotoUrl === next.asesorPhotoUrl &&
    prev.showRegenerate === next.showRegenerate
    // onRegenerate intencionalmente excluido — la prop cambia en cada render
    // del padre pero apunta a la misma lógica. No re-rendereamos por eso.
  );
});
