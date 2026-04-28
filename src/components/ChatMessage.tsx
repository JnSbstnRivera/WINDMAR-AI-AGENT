import { useState } from 'react';
import type { Message } from '../types';

interface Props {
  message: Message;
  isStreaming?: boolean;
  asesorEmail?: string;
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

// Avatar del asesor (intenta /asesor.png, fallback a inicial con halo)
function AsesorAvatar({ email }: { email: string }) {
  const initial = (email.split('@')[0]?.charAt(0) ?? 'A').toUpperCase();
  return (
    <div className="relative flex-shrink-0" style={{ width: 40, height: 40 }}>
      {/* Halo azul navy */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(27,58,92,0.5) 0%, rgba(27,58,92,0.15) 50%, transparent 75%)',
          filter: 'blur(6px)',
        }}
      />
      {/* Círculo con inicial */}
      <div
        className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md"
        style={{
          background: 'linear-gradient(135deg, #1B3A5C 0%, #2a5a8c 100%)',
          boxShadow: '0 4px 12px rgba(27,58,92,0.35)',
        }}
      >
        {initial}
      </div>
    </div>
  );
}

// Avatar del SUN BOT IA (con halo naranja)
function IAAvatar() {
  return (
    <div className="relative flex-shrink-0" style={{ width: 40, height: 40 }}>
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
  );
}

export function ChatMessage({ message, isStreaming, asesorEmail = '' }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  async function handleCopy() {
    await navigator.clipboard.writeText(stripForCopy(message.content));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isUser) {
    // ASESOR — burbuja a la derecha + avatar inicial a la derecha
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
        <AsesorAvatar email={asesorEmail} />
      </div>
    );
  }

  // IA — avatar SUN BOT a la izquierda + burbuja
  return (
    <div className="flex justify-start gap-3 mb-6">
      <IAAvatar />
      <div className="flex flex-col items-start min-w-0 max-w-[85%] sm:max-w-[80%]">
        <div
          className="relative rounded-2xl px-5 sm:px-7 py-5 sm:py-6 text-[15px] sm:text-[15.5px] text-gray-800 dark:text-gray-100 whitespace-pre-wrap leading-relaxed bg-white dark:bg-[#142033] border border-[#dde8f5] dark:border-white/[0.06] w-full"
          style={{
            boxShadow: '0 6px 24px rgba(27,58,92,0.08), 0 2px 6px rgba(27,58,92,0.05)',
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
