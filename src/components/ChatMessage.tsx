import { useState } from 'react';
import type { Message } from '../types';

interface Props {
  message: Message;
  isStreaming?: boolean;
}

function stripEmojis(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[^\S\n]+\n/g, '\n')
    .trim();
}

export function ChatMessage({ message, isStreaming }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  async function handleCopy() {
    await navigator.clipboard.writeText(stripEmojis(message.content));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="bg-[#1B3A5C] text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[70%] text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-[#F7941D] flex items-center justify-center flex-shrink-0 mt-1">
        <svg width="16" height="16" viewBox="0 0 80 80" fill="none">
          <path
            d="M40 12 L44 27 L60 27 L47 36 L52 51 L40 42 L28 51 L33 36 L20 27 L36 27 Z"
            fill="white"
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-[#f0f0f0] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
          {message.content}
          {isStreaming && (
            <span className="inline-block w-[2px] h-[14px] bg-gray-500 ml-1 align-middle animate-pulse" />
          )}
        </div>
        {!isStreaming && message.content && (
          <button
            onClick={handleCopy}
            className="mt-1 ml-2 text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 cursor-pointer"
          >
            {copied ? '✓ Copiado' : '⎘ Copiar para WhatsApp'}
          </button>
        )}
      </div>
    </div>
  );
}
