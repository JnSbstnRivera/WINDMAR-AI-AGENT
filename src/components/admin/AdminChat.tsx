'use client';

import { useRef, useState, useEffect } from 'react';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const SUGERENCIAS = [
  '¿Cuántos leads tiene cada asesor?',
  'Tráeme los leads sin nota en 24h',
  'Busca al cliente …',
  'Reasigna los leads de X a Y',
];

/**
 * Chat de gestión para el panel admin.
 * Usa el MISMO endpoint agéntico /api/chat (tool-use de Zoho con scope por rol):
 * como el admin tiene canSeeAll, puede consultar cualquier cartera, asignar y
 * anotar desde lenguaje natural. No persiste conversaciones (gestión efímera).
 */
export function AdminChat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs]);

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setInput('');
    setBusy(true);
    setMsgs((prev) => [...prev, { role: 'user', content: message }, { role: 'assistant', content: '' }]);

    try {
      const history = msgs.slice(-8).map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        setMsgs((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: `⚠️ ${err.error || 'Error consultando al agente'}` };
          return copy;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const current = acc;
        setMsgs((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: current };
          return copy;
        });
      }
    } catch {
      setMsgs((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: 'assistant', content: '⚠️ Error de conexión' };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px)', minHeight: 420 }}>
      <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--text1)', margin: '0 0 4px' }}>
        Chat de gestión
      </h1>
      <p style={{ color: 'var(--text2)', fontSize: 13, margin: '0 0 14px' }}>
        Dale órdenes al agente en lenguaje natural: consulta carteras de cualquier asesor, busca clientes, asigna leads y agrega notas.
      </p>

      {/* Mensajes */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10,
          padding: '14px 16px', borderRadius: 14,
          background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
        }}
      >
        {msgs.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center' }}>
            <img src="/sunbot-feliz.png" alt="" style={{ width: 64, height: 64, objectFit: 'contain', imageRendering: 'pixelated', margin: '0 auto 10px' }} />
            <div style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 14 }}>
              ¿Qué necesitas gestionar hoy?
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  onClick={() => (s.includes('…') ? setInput(s.replace('…', '')) : send(s))}
                  style={{
                    fontSize: 12, padding: '7px 12px', borderRadius: 999, cursor: 'pointer',
                    border: '1px solid rgba(247,148,29,0.45)', background: 'transparent', color: '#F7941D',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '10px 14px',
              borderRadius: 12,
              fontSize: 14,
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              background: m.role === 'user' ? 'rgba(247,148,29,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${m.role === 'user' ? 'rgba(247,148,29,0.35)' : 'var(--glass-border)'}`,
              color: 'var(--text1)',
            }}
          >
            {m.content || (busy && i === msgs.length - 1 ? '…' : '')}
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ej: tráeme la cartera de j.salas y dime cuáles necesitan seguimiento…"
          disabled={busy}
          style={{
            flex: 1, padding: '12px 14px', borderRadius: 12, fontSize: 14,
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text1)',
            outline: 'none',
          }}
        />
        <button
          onClick={() => send()}
          disabled={busy || !input.trim()}
          style={{
            padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600,
            cursor: busy || !input.trim() ? 'not-allowed' : 'pointer',
            border: '1px solid #F7941D',
            background: busy || !input.trim() ? 'transparent' : '#F7941D',
            color: busy || !input.trim() ? 'var(--text3)' : '#1B3A5C',
          }}
        >
          {busy ? '…' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}
