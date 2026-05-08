'use client';

import { useState } from 'react';
import type { Message } from '@/types';
import { UserAvatar } from './UserAvatar';

interface Props {
  message: Message;
  isStreaming?: boolean;
  asesorEmail?: string;
  asesorDisplayName?: string;
  asesorPhotoUrl?: string | null;
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

type Segment = { type: 'text'; value: string } | { type: 'bold'; value: string } | { type: 'link'; text: string; url: string };

function parseLine(line: string): Segment[] {
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)|\*\*([^*]+)\*\*|(https?:\/\/\S+)/g;
  const segments: Segment[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line)) !== null) {
    if (match.index > last) segments.push({ type: 'text', value: line.slice(last, match.index) });
    if (match[1] && match[2]) {
      segments.push({ type: 'link', text: match[1], url: match[2] });
    } else if (match[3]) {
      segments.push({ type: 'bold', value: match[3] });
    } else if (match[4]) {
      segments.push({ type: 'link', text: match[4], url: match[4] });
    }
    last = pattern.lastIndex;
  }
  if (last < line.length) segments.push({ type: 'text', value: line.slice(last) });
  return segments;
}

function renderContent(text: string) {
  return text.split('\n').map((line, i, arr) => (
    <span key={i}>
      {parseLine(line).map((seg, j) => {
        if (seg.type === 'bold') return <strong key={j} className="font-bold text-[#1B3A5C] dark:text-white">{seg.value}</strong>;
        if (seg.type === 'link') return (
          <a key={j} href={seg.url} target="_blank" rel="noopener noreferrer"
            className="text-[#F7941D] dark:text-[#F7941D] underline font-semibold hover:text-[#e8830d] transition-colors">
            {seg.text}
          </a>
        );
        return <span key={j}>{seg.value}</span>;
      })}
      {i < arr.length - 1 && '\n'}
    </span>
  ));
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

export function ChatMessage({
  message,
  isStreaming,
  asesorEmail = '',
  asesorDisplayName,
  asesorPhotoUrl,
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
  const displayContent = message.content.replace(/\n*\[ERROR_TYPE:[^\]]+\]/g, '');

  return (
    <div className="flex justify-start gap-3 mb-8">
      <IAAvatar isStreaming={isStreaming} isError={isErrorMessage} />
      <div className="flex flex-col items-start min-w-0 flex-1 pt-1.5">
        <div className="text-[15px] sm:text-[15.5px] text-gray-800 dark:text-gray-100 whitespace-pre-wrap leading-relaxed w-full">
          {renderContent(displayContent)}
          {isStreaming && (
            <span className="inline-block w-[2px] h-[14px] bg-[#F7941D] ml-1 align-middle animate-pulse" />
          )}
        </div>

        {!isStreaming && message.content && (
          <button
            onClick={handleCopy}
            className="mt-3 text-xs text-gray-400 hover:text-[#F7941D] dark:hover:text-[#F7941D] transition-colors flex items-center gap-1 cursor-pointer"
          >
            {copied ? '✓ Copiado' : '⎘ Copiar para WhatsApp'}
          </button>
        )}
      </div>
    </div>
  );
}
