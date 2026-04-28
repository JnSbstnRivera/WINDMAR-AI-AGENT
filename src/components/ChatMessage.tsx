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
      <div className="flex justify-end mb-5">
        <div
          className="text-white rounded-2xl px-5 py-3 max-w-[70%] text-sm leading-relaxed"
          style={{
            background: 'linear-gradient(135deg, #1B3A5C 0%, #2a5a8c 100%)',
            boxShadow: '0 4px 14px rgba(27,58,92,0.25)',
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 mb-6 mr-auto" style={{ maxWidth: '92%' }}>
      {/* Avatar SUN BOT con halo */}
      <div className="relative flex-shrink-0 mt-1" style={{ width: 40, height: 40 }}>
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(247,148,29,0.55) 0%, rgba(247,148,29,0.15) 50%, transparent 75%)',
            filter: 'blur(8px)',
          }}
        />
        <img
          src="/sunbot.png"
          alt="Windmar AI"
          className="mascot-img relative z-10 w-10 h-10 object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Burbuja — card style con acento naranja a la izquierda */}
      <div className="flex-1 min-w-0">
        <div
          className="relative rounded-2xl px-6 py-5 text-[15px] text-gray-800 dark:text-gray-100 whitespace-pre-wrap leading-relaxed bg-white dark:bg-[#142033] border border-[#dde8f5] dark:border-white/[0.06]"
          style={{
            boxShadow: '0 4px 20px rgba(27,58,92,0.06), 0 1px 3px rgba(27,58,92,0.04)',
          }}
        >
          {/* Acento naranja a la izquierda */}
          <div
            className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full"
            style={{
              background: 'linear-gradient(180deg, #F7941D 0%, #e8830d 100%)',
              opacity: 0.7,
            }}
          />
          <div className="pl-2">
            {renderContent(message.content)}
            {isStreaming && (
              <span className="inline-block w-[2px] h-[14px] bg-[#F7941D] ml-1 align-middle animate-pulse" />
            )}
          </div>
        </div>

        {!isStreaming && message.content && (
          <button
            onClick={handleCopy}
            className="mt-2 ml-2 text-xs text-gray-400 hover:text-[#F7941D] dark:hover:text-[#F7941D] transition-colors flex items-center gap-1 cursor-pointer"
          >
            {copied ? '✓ Copiado' : '⎘ Copiar para WhatsApp'}
          </button>
        )}
      </div>
    </div>
  );
}
