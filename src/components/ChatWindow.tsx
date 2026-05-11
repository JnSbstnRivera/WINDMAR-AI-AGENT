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
}

export function ChatWindow({
  messages,
  isStreaming,
  userEmail = '',
  userDisplayName,
  userPhotoUrl,
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

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-10 py-6">
      <div className="max-w-3xl mx-auto">
        {messages.map((msg, i) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            asesorEmail={userEmail}
            asesorDisplayName={userDisplayName}
            asesorPhotoUrl={userPhotoUrl}
            isStreaming={
              isStreaming && i === messages.length - 1 && msg.role === 'assistant'
            }
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
