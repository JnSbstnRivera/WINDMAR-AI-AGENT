'use client';

import { useRef, useState } from 'react';

type Cache = { content: string; createdAt: string | null } | null;

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const ms = Date.now() - Date.parse(iso);
  if (isNaN(ms)) return '';
  const h = Math.floor(ms / 3600000);
  if (h < 1) return 'hace <1h';
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

/**
 * Ícono de nota: al pasar el mouse (o tocar) muestra la ÚLTIMA nota del lead en
 * un mini pop-up, estilo Zoho. Carga bajo demanda (250ms de hover) y cachea el
 * resultado para no repetir la llamada. Pop-up con position:fixed para no
 * recortarse dentro de tablas con scroll.
 */
export function NoteHover({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<Cache>(null);
  const [err, setErr] = useState('');
  const loaded = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    if (loaded.current) return;
    setLoading(true); setErr('');
    try {
      const r = await fetch(`/api/zoho/last-note?leadId=${encodeURIComponent(leadId)}`);
      const j = await r.json();
      if (!r.ok) setErr(j.error || 'No se pudo cargar');
      else { setNote(j.note ?? null); loaded.current = true; }
    } catch { setErr('Error de conexión'); }
    finally { setLoading(false); }
  }

  function show(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({ x: rect.left, y: rect.bottom + 6 });
    setOpen(true);
    timer.current = setTimeout(load, 220);
  }
  function hide() {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  }

  return (
    <span
      onMouseEnter={show}
      onMouseLeave={hide}
      onClick={(e) => { e.stopPropagation(); if (open) hide(); else show(e); }}
      style={{ cursor: 'pointer', position: 'relative', display: 'inline-flex' }}
      title="Última nota"
    >
      <span style={{ fontSize: 13, opacity: note === null && loaded.current ? 0.35 : 0.85 }}>📝</span>
      {open && pos && (
        <div
          style={{
            position: 'fixed', left: pos.x, top: pos.y, zIndex: 60, width: 280, maxWidth: '80vw',
            background: '#13243b', border: '1px solid rgba(247,148,29,0.45)', borderRadius: 10,
            padding: '8px 10px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', pointerEvents: 'none',
          }}
        >
          <div style={{ color: '#F7941D', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            Última nota{note?.createdAt ? ` · ${timeAgo(note.createdAt)}` : ''}
          </div>
          {loading && <div style={{ color: '#94a3b8', fontSize: 12 }}>Cargando…</div>}
          {!loading && err && <div style={{ color: '#fca5a5', fontSize: 12 }}>{err}</div>}
          {!loading && !err && (note
            ? <div style={{ color: '#e8eaf0', fontSize: 12.5, lineHeight: 1.45, whiteSpace: 'pre-wrap', maxHeight: 160, overflow: 'hidden' }}>{note.content}</div>
            : <div style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>Sin notas todavía.</div>)}
        </div>
      )}
    </span>
  );
}
