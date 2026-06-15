'use client';

import { useEffect, useState } from 'react';
import { callHref } from '@/lib/dialer';

interface LeadBrief {
  id: string;
  leadNumber: string | null;
  fullName: string;
  status: string | null;
  phone: string | null;
  zohoUrl: string;
  when: string | null;
}

interface Briefing {
  empty: boolean;
  name?: string;
  total?: number;
  accionables?: number;
  citasHoy?: LeadBrief[];
  citasHoyTotal?: number;
  seguimientos?: LeadBrief[];
  seguimientosTotal?: number;
}

function greetingPR(): string {
  const h = (new Date().getUTCHours() - 4 + 24) % 24;
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

/**
 * Briefing matutino — resumen proactivo de la cartera al abrir el chat:
 * citas de hoy + seguimientos para hoy/vencidos + accionables. Se autocarga;
 * si el usuario no tiene leads (o hay error), no renderiza nada.
 */
export function BriefingCard({ onSend }: { onSend: (text: string) => void }) {
  const [data, setData] = useState<Briefing | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/zoho/briefing')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive && j && !j.error) setData(j); })
      .catch(() => { /* silencioso: el briefing es opcional */ });
    return () => { alive = false; };
  }, []);

  if (!data || data.empty || hidden) return null;

  const citas = data.citasHoy ?? [];
  const segs = data.seguimientos ?? [];
  const nada = citas.length === 0 && segs.length === 0;

  const Row = ({ l, tag }: { l: LeadBrief; tag: string | null }) => (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div className="flex-1 min-w-0">
        <div style={{ color: '#e8eaf0', fontSize: 13.5, fontWeight: 600 }} className="truncate">{l.fullName}</div>
        <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 1 }}>
          {tag ? `${tag} · ` : ''}{l.status || 'sin estado'}{l.leadNumber ? ` · ${l.leadNumber}` : ''}
        </div>
      </div>
      {callHref(l.phone, '3cx') && (
        <a href={callHref(l.phone, '3cx')!} style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, whiteSpace: 'nowrap' }} title={`Llamar ${l.phone} con 3CX`}>3CX</a>
      )}
      {callHref(l.phone, 'kixie') && (
        <a href={callHref(l.phone, 'kixie')!} style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, whiteSpace: 'nowrap' }} title={`Llamar ${l.phone} con Kixie`}>Kixie</a>
      )}
      <button
        onClick={() => onSend(`Busca a ${l.fullName}${l.leadNumber ? ` (${l.leadNumber})` : ''} y dime qué pasó`)}
        style={{ fontSize: 11, color: '#F7941D', cursor: 'pointer', background: 'none', border: 'none', whiteSpace: 'nowrap' }}
      >
        Abrir
      </button>
    </div>
  );

  return (
    <div className="mx-auto mb-4 w-full max-w-2xl rounded-xl border-2 px-4 py-3 text-left" style={{ background: '#0a1628', borderColor: 'rgba(247,148,29,0.4)' }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div style={{ color: '#F7941D', fontWeight: 700, fontSize: 15 }}>
            ☀️ {greetingPR()}{data.name ? `, ${data.name}` : ''}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 1 }}>
            {data.total} leads en tu cartera · {data.accionables} accionables
          </div>
        </div>
        <button onClick={() => setHidden(true)} className="text-gray-500 hover:text-white cursor-pointer" aria-label="Cerrar briefing" title="Cerrar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>

      {citas.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ color: '#a78bfa', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
            📅 Citas de hoy ({data.citasHoyTotal})
          </div>
          <div className="flex flex-col gap-1.5">{citas.map((l) => <Row key={l.id} l={l} tag={l.when} />)}</div>
        </div>
      )}

      {segs.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ color: '#F7941D', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
            ⏰ Para llamar hoy o antes ({data.seguimientosTotal})
          </div>
          <div className="flex flex-col gap-1.5">{segs.map((l) => <Row key={l.id} l={l} tag={l.when} />)}</div>
        </div>
      )}

      <div className="flex flex-wrap gap-2" style={{ marginTop: 12 }}>
        <button
          onClick={() => onSend('Tráeme mis leads urgentes de seguimiento')}
          style={{ fontSize: 12, padding: '6px 12px', borderRadius: 999, cursor: 'pointer', border: '1px solid rgba(247,148,29,0.5)', color: '#F7941D', background: 'transparent' }}
        >
          {nada ? '¿A quién llamo primero?' : 'Ver todos mis urgentes'}
        </button>
        <button
          onClick={() => onSend('Muéstrame mi cartera')}
          style={{ fontSize: 12, padding: '6px 12px', borderRadius: 999, cursor: 'pointer', border: '1px solid rgba(148,163,184,0.4)', color: '#94a3b8', background: 'transparent' }}
        >
          Ver mi cartera completa
        </button>
      </div>
    </div>
  );
}
