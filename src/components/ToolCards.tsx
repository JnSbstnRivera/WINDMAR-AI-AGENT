'use client';

import { memo } from 'react';
import type { ToolRef } from '@/types';

interface Props {
  tools: ToolRef[];
}

/**
 * Cards visuales bajo la respuesta del asistente con las herramientas que
 * recomendó. Cada card abre la herramienta en nueva pestaña al hacer click.
 *
 * Estilo: brand Windmar (navy + naranja). Borde naranja para herramientas
 * oficiales (windmar.com), gris para internas (vercel.app).
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
        {tools.map((t) => (
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
            {/* Icono (emoji desde la tabla `tools.icon`) */}
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#1B3A5C]/5 dark:bg-[#F7941D]/10 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              {t.icon || '🔗'}
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
        ))}
      </div>
    </div>
  );
}

export const ToolCards = memo(ToolCardsImpl, (prev, next) => {
  if (prev.tools === next.tools) return true;
  if (prev.tools.length !== next.tools.length) return false;
  return prev.tools.every((t, i) => t.slug === next.tools[i].slug);
});
