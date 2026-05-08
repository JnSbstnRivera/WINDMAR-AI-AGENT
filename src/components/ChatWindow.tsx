'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import type { Message } from '@/types';

interface Props {
  messages: Message[];
  isStreaming: boolean;
  userEmail?: string;
}

export function ChatWindow({ messages, isStreaming, userEmail = '' }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-10 py-6">
      <div className="max-w-3xl mx-auto">
        {messages.map((msg, i) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            asesorEmail={userEmail}
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
