'use client';

import { memo } from 'react';
import type { ToolRef } from '@/types';

interface Props {
  tools: ToolRef[];
}

// ════════════════════════════════════════
// PALETA NEON por topic
// ════════════════════════════════════════
// Cada topic tiene un color base + halo. Diseñado en armonía con la marca
// Windmar (naranja para solar) pero con paleta executive para los demás.
const TOPIC_COLORS: Record<string, { base: string; glow: string; bg: string }> = {
  solar:          { base: '#F7941D', glow: 'rgba(247, 148, 29, 0.55)', bg: 'rgba(247, 148, 29, 0.10)' },
  roofing:        { base: '#7c3aed', glow: 'rgba(124, 58, 237, 0.50)', bg: 'rgba(124, 58, 237, 0.10)' },
  water:          { base: '#06b6d4', glow: 'rgba(6, 182, 212, 0.50)',  bg: 'rgba(6, 182, 212, 0.10)' },
  anker:          { base: '#10b981', glow: 'rgba(16, 185, 129, 0.50)', bg: 'rgba(16, 185, 129, 0.10)' },
  ev:             { base: '#06b6d4', glow: 'rgba(6, 182, 212, 0.50)',  bg: 'rgba(6, 182, 212, 0.10)' },
  financiamiento: { base: '#f59e0b', glow: 'rgba(245, 158, 11, 0.50)', bg: 'rgba(245, 158, 11, 0.10)' },
  cierre:         { base: '#f43f5e', glow: 'rgba(244, 63, 94, 0.50)',  bg: 'rgba(244, 63, 94, 0.10)' },
  'pre-venta':    { base: '#7c3aed', glow: 'rgba(124, 58, 237, 0.50)', bg: 'rgba(124, 58, 237, 0.10)' },
  gestion:        { base: '#06b6d4', glow: 'rgba(6, 182, 212, 0.45)',  bg: 'rgba(6, 182, 212, 0.10)' },
  general:        { base: '#F7941D', glow: 'rgba(247, 148, 29, 0.50)', bg: 'rgba(247, 148, 29, 0.10)' },
};

function colorsFor(topic: string | undefined) {
  return TOPIC_COLORS[topic ?? 'general'] ?? TOPIC_COLORS.general;
}

// ════════════════════════════════════════
// LIBRARY DE SVGS (estilo Lucide) — uno por slug
// ════════════════════════════════════════
// Mapeo deliberado para que el asesor reconozca la herramienta de un vistazo.
// Si se agrega una herramienta nueva en la BD, cae al icono genérico.
function IconFor({ slug }: { slug: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (slug) {
    case 'luma-scanner':
      // bolt — análisis de bill / consumo
      return <svg {...common}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;

    case 'cotizador-loan':
    case 'cotizador-loan-wh':
    case 'wh-financial':
      // banknote — préstamo / dinero
      return <svg {...common}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>;

    case 'cotizador-lease':
    case 'cotizador-lease-wh':
    case 'enfin':
      // file-signature — lease / contrato
      return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 18a3 3 0 0 0-3 0"/><path d="M16 14h-6"/></svg>;

    case 'cotizador-roofing':
    case 'cotizador-roofing-wh':
      // home — techo
      return <svg {...common}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;

    case 'cotizador-agua':
    case 'cotizador-water-wh':
      // droplet — agua
      return <svg {...common}><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>;

    case 'calculadora-anker':
      // battery-charging — Anker
      return <svg {...common}><polyline points="13 4 8 13 12 13 11 20 16 11 12 11 13 4"/><path d="M5 18H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3.19"/><path d="M16.42 6H21a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-3.19"/><line x1="23" y1="13" x2="23" y2="11"/></svg>;

    case 'proyecto-completo':
      // package — paquete combinado
      return <svg {...common}><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;

    case 'calculadora-placas-ac':
      // wind — aire acondicionado
      return <svg {...common}><path d="M9.59 4.59A2 2 0 1 1 11 8H2"/><path d="M17.73 18.27A2.5 2.5 0 1 0 19.5 14H2"/><path d="M14.83 5.83A3 3 0 1 1 17 11H2"/></svg>;

    case 'calculadora-ev':
      // car — vehículo eléctrico
      return <svg {...common}><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>;

    case 'calculadora-enseres':
      // calculator — enseres / consumo
      return <svg {...common}><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><path d="M8 14h.01M12 14h.01M8 18h.01M12 18h.01M8 10h.01M12 10h.01M16 10h.01"/></svg>;

    case 'aurora':
      // layers / sun-rays — diseño solar técnico
      return <svg {...common}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;

    case 'palmetto-lightreach':
      // sun — solar lease
      return <svg {...common}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;

    case 'synchrony':
    case 'kiwi':
      // credit-card
      return <svg {...common}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;

    case 'docusign':
      // file-pen — firma de contratos
      return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="11" x2="13" y2="11"/></svg>;

    case 'smartsheet':
      // clipboard-list — registro post-venta
      return <svg {...common}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>;

    case 'catastro-crim':
    case 'regrid':
      // map — catastro
      return <svg {...common}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;

    case 'measure-map':
      // ruler — medición de techo
      return <svg {...common}><path d="M21.3 8.7l-2-2 -16 16 2 2"/><path d="M16.3 3.7l4 4 -3 3 -4-4z"/><line x1="9.5" y1="14.5" x2="11.5" y2="16.5"/><line x1="6.5" y1="17.5" x2="8.5" y2="19.5"/><line x1="14" y1="10" x2="16" y2="12"/></svg>;

    case 'panel-general':
      // grid — panel central
      return <svg {...common}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;

    case '3cx':
      // phone — llamadas
      return <svg {...common}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;

    case 'zoho':
      // briefcase — CRM
      return <svg {...common}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;

    case 'botmaker':
      // message-circle — WhatsApp
      return <svg {...common}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>;

    default:
      // link genérico (fallback)
      return <svg {...common}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
  }
}

/**
 * Cards visuales bajo la respuesta del asistente con las herramientas que
 * recomendó. Cada card abre la herramienta en nueva pestaña al hacer click.
 *
 * Iconos: SVG vectoriales tintados según el topic (solar=naranja, roofing=
 * violeta, water=cyan...). Glow real con drop-shadow del color base.
 * Borde naranja para herramientas oficiales (windmar.com), gris para internas.
 */
function ToolCardsImpl({ tools }: Props) {
  if (!tools || tools.length === 0) return null;

  return (
    <div className="mt-4 w-full">
      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
        Herramientas sugeridas
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {tools.map((t) => {
          const c = colorsFor(t.topic);
          return (
            <a
              key={t.slug}
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group relative flex items-start gap-3 p-3 bg-white dark:bg-[#0f1c2e] border-2 rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                t.is_official
                  ? 'border-[#F7941D]/50 hover:border-[#F7941D]'
                  : 'border-gray-200 dark:border-gray-700 hover:border-[#1B3A5C] dark:hover:border-[#F7941D]/60'
              }`}
              title={t.description ?? t.name}
            >
              {/* Icono SVG vector con glow neon del color del topic */}
              <div
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
                style={{
                  background: c.bg,
                  color: c.base,
                  boxShadow: `0 0 10px ${c.glow}, inset 0 0 0 1px ${c.glow}`,
                }}
              >
                <span
                  style={{ filter: `drop-shadow(0 0 4px ${c.glow})` }}
                  className="flex items-center justify-center"
                >
                  <IconFor slug={t.slug} />
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-[13px] text-[#1B3A5C] dark:text-white leading-tight">
                    {t.name}
                  </span>
                  {t.is_official && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#F7941D] bg-[#F7941D]/10 px-1.5 py-0.5 rounded">
                      Oficial
                    </span>
                  )}
                </div>
                {t.description && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {t.description}
                  </p>
                )}
              </div>

              <div className="flex-shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-[#F7941D] transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

export const ToolCards = memo(ToolCardsImpl, (prev, next) => {
  if (prev.tools === next.tools) return true;
  if (prev.tools.length !== next.tools.length) return false;
  return prev.tools.every((t, i) => t.slug === next.tools[i].slug);
});
