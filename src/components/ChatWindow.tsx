import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import type { Message } from '../types';

interface Props {
  messages: Message[];
  isStreaming: boolean;
}

export function ChatWindow({ messages, isStreaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 md:pl-6 md:pr-12 py-6">
      <div className="max-w-5xl">
        {messages.map((msg, i) => (
          <ChatMessage
            key={msg.id}
            message={msg}
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
