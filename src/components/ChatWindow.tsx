'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import type { Message } from '@/types';

interface Props {
  messages: Message[];
  isStreaming: boolean;
  userEmail?: string;
  userDisplayName?: string;
  userPhotoUrl?: string | null;
  onRegenerate?: () => void;
  conversationId?: string | null;
  /** Handler para chips Quick Replies — al click manda esa pregunta al chat */
  onQuickReply?: (text: string) => void;
}

export function ChatWindow({
  messages,
  isStreaming,
  userEmail = '',
  userDisplayName,
  userPhotoUrl,
  onRegenerate,
  conversationId,
  onQuickReply,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastScrollRef = useRef<number>(0);

  // Auto-scroll throttled: máximo 1 scroll cada 100ms.
  // Durante streaming llegan 10-15 chunks/seg — sin throttle, cada chunk dispara
  // una animación que da sensación de "tartamudeo". Con throttle + behavior:'auto'
  // el scroll fluye natural como ChatGPT.
  useEffect(() => {
    const now = Date.now();
    if (now - lastScrollRef.current < 100) return;
    lastScrollRef.current = now;
    bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [messages]);

  // Scroll final garantizado cuando termina el streaming
  useEffect(() => {
    if (!isStreaming) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [isStreaming]);

  // Las tarjetas/tablas (leads, ficha, tipificación, quick replies) se adjuntan
  // DESPUÉS del stream y cambian la altura del mensaje → la vista "brincaba".
  // Cuando el último mensaje gana ese contenido, re-bajamos al final (con un
  // pequeño delay para que la tabla termine de montar/medir).
  const last = messages[messages.length - 1];
  const lastExtrasKey = last
    ? [last.id, last.leads ? 'L' : '', last.client ? 'C' : '', last.actions?.length ?? 0, last.quickReplies?.length ?? 0, last.tools?.length ?? 0, last.quality ? 'Q' : ''].join('|')
    : '';
  useEffect(() => {
    if (isStreaming || !lastExtrasKey) return;
    const id = setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 80);
    return () => clearTimeout(id);
  }, [lastExtrasKey, isStreaming]);

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-6">
      <div className="max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto">
        {messages.map((msg, i) => {
          // El botón "Regenerar" SOLO aparece en el último mensaje del asistente
          // (no en mensajes anteriores) y solo cuando NO está en streaming.
          const isLastAssistant =
            msg.role === 'assistant' &&
            i === messages.length - 1 &&
            !isStreaming;
          return (
            <ChatMessage
              key={msg.id}
              message={msg}
              asesorEmail={userEmail}
              asesorDisplayName={userDisplayName}
              asesorPhotoUrl={userPhotoUrl}
              isStreaming={
                isStreaming && i === messages.length - 1 && msg.role === 'assistant'
              }
              showRegenerate={isLastAssistant}
              onRegenerate={isLastAssistant ? onRegenerate : undefined}
              conversationId={conversationId}
              onQuickReply={isLastAssistant ? onQuickReply : undefined}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
