import { useState } from 'react';
import type { Message } from '../types';

interface Props {
  message: Message;
  isStreaming?: boolean;
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
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const segments = parseLine(line);
    return (
      <span key={i}>
        {segments.map((seg, j) => {
          if (seg.type === 'bold') return <strong key={j} className="font-semibold">{seg.value}</strong>;
          if (seg.type === 'link') return (
            <a
              key={j}
              href={seg.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1B3A5C] underline font-medium hover:text-[#F7941D] transition-colors"
            >
              {seg.text}
            </a>
          );
          return <span key={j}>{seg.value}</span>;
        })}
        {i < lines.length - 1 && '\n'}
      </span>
    );
  });
}

export function ChatMessage({ message, isStreaming }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  async function handleCopy() {
    await navigator.clipboard.writeText(stripForCopy(message.content));
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
      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 mt-1 bg-[#0d1f35]"
        style={{ animation: 'avatar-bob 3s ease-in-out infinite' }}>
        <img src="/mascot.png" alt="Windmar AI" className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
        <style>{`
          @keyframes avatar-bob {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-2px); }
          }
        `}</style>
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-[#f0f0f0] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
          {renderContent(message.content)}
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
