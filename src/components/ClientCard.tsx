'use client';

import { useEffect, useState } from 'react';
import type { ZohoClientFull } from '@/lib/zoho';

interface Props {
  client: ZohoClientFull;
}

/**
 * Card visual del cliente cuando se invoca /cliente {q}.
 * Muestra datos del lead + deals + sugerencias del coach IA.
 *
 * Sigue el estilo neón Windmar para integrarse al chat sin romper la armonía.
 */
export function ClientCard({ client }: Props) {
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [loadingCoach, setLoadingCoach] = useState(true);
  const [coachError, setCoachError] = useState<string | null>(null);

  // Pedir sugerencias del coach automáticamente al montar
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch('/api/zoho/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client }),
        });
        const data = await res.json();
        if (cancel) return;
        if (!res.ok) {
          setCoachError(data.error || 'No se pudieron generar sugerencias');
        } else {
          setSuggestions(data.suggestions || null);
        }
      } catch {
        if (!cancel) setCoachError('Error de conexión');
      } finally {
        if (!cancel) setLoadingCoach(false);
      }
    })();
    return () => {
      cancel = true;
    };
    // Dependemos del ID del lead (primitivo) — evita re-fetch si el padre
    // re-renderiza y pasa un objeto client con referencia nueva pero datos
    // iguales. Sin esto, podía haber duplicado de calls a /api/zoho/coach.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.lead.id]);

  const { lead, deals, summary } = client;
  const initials = lead.fullName
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className="mx-auto my-3 max-w-[860px] w-full rounded-xl border-2 wm-fade-in"
      style={{
        background: 'linear-gradient(180deg, #0a1628 0%, #0f1c2e 60%, #1B3A5C 100%)',
        borderColor: 'rgba(247,148,29,0.5)',
        boxShadow: '0 0 32px rgba(247,148,29,0.25), 0 0 64px rgba(124,58,237,0.12)',
        color: '#e8edf8',
      }}
    >
      {/* ────────── HEADER ────────── */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-orange-500/30">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #F7941D 0%, #e8830d 100%)',
            color: '#fff',
            boxShadow: '0 0 18px rgba(247,148,29,0.45)',
          }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-widest text-[#F7941D] font-bold">
            🔍 Cliente encontrado en Zoho
          </p>
          <h3 className="text-lg font-bold text-white truncate">{lead.fullName}</h3>
          <p className="text-xs text-gray-300 mt-0.5">
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="hover:text-[#F7941D] transition-colors">
                {lead.email}
              </a>
            )}
            {lead.email && (lead.mobile || lead.phone) && <span className="mx-2">·</span>}
            {(lead.mobile || lead.phone) && (
              <a
                href={`tel:${(lead.mobile || lead.phone || '').replace(/\D/g, '')}`}
                className="hover:text-[#F7941D] transition-colors"
              >
                {lead.mobile || lead.phone}
              </a>
            )}
          </p>
        </div>
        <a
          href={lead.zohoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md border border-[#F7941D]/40 text-[#F7941D] hover:bg-[#F7941D]/15 transition-colors"
          title="Abrir en Zoho CRM"
        >
          Abrir en Zoho
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>

      {/* ────────── RESUMEN (chips clave) ────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-5 py-3 border-b border-white/10 text-[11px]">
        <Chip
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          }
          label="Sistema actual"
          value={summary.sistemaComprado}
        />
        <Chip
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
          label="Consultor"
          value={summary.consultor}
        />
        <Chip
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          }
          label="Total cotizaciones"
          value={`${summary.totalDeals} (${summary.dealsAbiertos} abiertas)`}
        />
        <Chip
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
          label="Etapa"
          value={lead.stage || 'Sin clasificar'}
        />
      </div>

      {/* ────────── DEALS (cotizaciones / contratos) ────────── */}
      {deals.length > 0 && (
        <div className="px-5 py-3 border-b border-white/10">
          <p className="text-[10px] uppercase tracking-widest text-[#F7941D] font-bold mb-2">
            📄 Cotizaciones / Contratos ({deals.length})
          </p>
          <div className="space-y-1.5">
            {deals.slice(0, 5).map((d) => (
              <a
                key={d.id}
                href={d.zohoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 rounded-md bg-white/5 hover:bg-[#F7941D]/15 border border-transparent hover:border-[#F7941D]/30 transition-all group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate group-hover:text-[#F7941D] transition-colors">
                      {d.name}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {d.productName && <span>{d.productName} · </span>}
                      {d.stage && <span>{d.stage}</span>}
                      {d.createdAt && (
                        <span className="ml-2 text-gray-500">
                          {d.createdAt.slice(0, 10)}
                        </span>
                      )}
                    </p>
                  </div>
                  <svg
                    className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#F7941D] flex-shrink-0"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </div>
              </a>
            ))}
            {deals.length > 5 && (
              <a
                href={lead.zohoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-[11px] text-[#F7941D] hover:underline pt-1"
              >
                Ver las {deals.length - 5} cotizaciones restantes en Zoho →
              </a>
            )}
          </div>
        </div>
      )}

      {/* ────────── COACH IA ────────── */}
      <div className="px-5 py-4">
        <p className="text-[10px] uppercase tracking-widest text-[#F7941D] font-bold mb-2 flex items-center gap-1.5">
          ☀️ Coach IA — qué ofrecerle a este cliente
        </p>
        {loadingCoach ? (
          <div className="flex items-center gap-2 text-xs text-gray-400 italic py-3">
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            Analizando historial y generando sugerencias…
          </div>
        ) : coachError ? (
          <div className="rounded-md bg-red-900/30 border border-red-700/50 px-3 py-2 text-xs text-red-300">
            ⚠️ {coachError}
          </div>
        ) : (
          <div
            className="text-sm leading-relaxed text-gray-200 prose-coach"
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {suggestions}
          </div>
        )}
      </div>

      <style>{`
        .prose-coach strong { color: #F7941D; font-weight: 700; }
      `}</style>
    </div>
  );
}

// ─── Chip pequeño con icono + label + value ───
function Chip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 border border-white/10">
      <span className="text-[#F7941D] flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold leading-tight">
          {label}
        </p>
        <p className="text-[11px] text-white font-medium leading-tight mt-0.5 truncate" title={value}>
          {value}
        </p>
      </div>
    </div>
  );
}
