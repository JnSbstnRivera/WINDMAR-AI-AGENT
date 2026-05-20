'use client';

import { memo } from 'react';
import type { QualityMeta } from '@/types';

interface Props {
  meta: QualityMeta;
}

// ════════════════════════════════════════
// DATA — fuente de verdad de la matriz
// (espejo de las entradas CALIDAD_LLAMADA en Supabase)
// ════════════════════════════════════════
const CATEGORIAS = [
  {
    key: 'inicio',
    nombre: 'INICIO',
    peso: 30,
    color: '#7c3aed',
    glow: 'rgba(124, 58, 237, 0.5)',
    bg: 'rgba(124, 58, 237, 0.10)',
    descripcion: 'Claridad y validación de comprensión',
    items: [
      { nombre: 'Saludo', tipo: 'NO_CRITICO' },
      { nombre: 'Presentar función', tipo: 'NO_CRITICO' },
      { nombre: 'Preguntas de investigación', tipo: 'NO_CRITICO' },
      { nombre: 'Despedida', tipo: 'NO_CRITICO' },
      { nombre: 'Desinterés en entregar oferta', tipo: 'CRITICO' },
    ],
  },
  {
    key: 'actitud',
    nombre: 'ACTITUD COMERCIAL',
    peso: 50,
    color: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.5)',
    bg: 'rgba(6, 182, 212, 0.10)',
    descripcion: 'Manejo del cliente y objeciones',
    items: [
      { nombre: 'Maltrato o reacción grosera', tipo: 'CRITICO' },
      { nombre: 'Manejo de objeciones', tipo: 'CRITICO' },
      { nombre: 'Información correcta', tipo: 'CRITICO' },
      { nombre: 'Tiempos de espera', tipo: 'NO_CRITICO' },
      { nombre: 'Atiende oportunamente', tipo: 'NO_CRITICO' },
      { nombre: 'Establece acuerdos', tipo: 'NO_CRITICO' },
      { nombre: 'Indaga comercialmente', tipo: 'NO_CRITICO' },
      { nombre: 'Posibilidades cita/venta', tipo: 'NO_CRITICO' },
      { nombre: 'Escucha activa', tipo: 'NO_CRITICO' },
      { nombre: 'Tono y ritmo de voz', tipo: 'NO_CRITICO' },
    ],
  },
  {
    key: 'seguimiento',
    nombre: 'SEGUIMIENTO',
    peso: 20,
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.5)',
    bg: 'rgba(16, 185, 129, 0.10)',
    descripcion: 'Documentación y estados en Zoho',
    items: [
      { nombre: 'Disminuye ritmo laboral', tipo: 'CRITICO' },
      { nombre: 'Documenta en Zoho', tipo: 'NO_CRITICO' },
      { nombre: 'Cambia estado correctamente', tipo: 'CRITICO' },
      { nombre: 'Revisión del historial', tipo: 'CRITICO' },
    ],
  },
] as const;

const TIEMPO_POR_AREA: Record<string, { segundos: number; descripcion: string }> = {
  Telemercadeo: { segundos: 60, descripcion: 'Prospección — llamadas más cortas' },
  Ventas: { segundos: 210, descripcion: 'Cotizaciones técnicas + validación financiera' },
  Vass: { segundos: 210, descripcion: 'Corre crédito en vivo durante la llamada' },
};

// ════════════════════════════════════════
// COMPONENTE
// ════════════════════════════════════════
function QualityCardImpl({ meta }: Props) {
  if (!meta) return null;

  return (
    <div className="mt-4 w-full wm-fade-in">
      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        Matriz de Calidad
      </p>

      {meta.highlight === 'times' && <TimesCard area={meta.area} />}
      {meta.highlight === 'criticals' && <CriticalsCard />}
      {meta.highlight === 'matrix' && <MatrixCard />}
    </div>
  );
}

// ════════════════════════════════════════
// TIMES CARD — tiempo de espera grande
// ════════════════════════════════════════
function TimesCard({ area }: { area?: string | null }) {
  // Si tenemos área del asesor, mostrar SU tiempo destacado
  if (area && TIEMPO_POR_AREA[area]) {
    const t = TIEMPO_POR_AREA[area];
    return (
      <div
        className="relative overflow-hidden rounded-xl p-5 border-2"
        style={{
          borderColor: '#F7941D',
          background: 'linear-gradient(135deg, rgba(247,148,29,0.08), rgba(247,148,29,0.02))',
          boxShadow: '0 0 18px rgba(247,148,29,0.15), inset 0 0 0 1px rgba(247,148,29,0.2)',
        }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#F7941D] mb-1">
              Tu área · {area}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
              Tiempo máximo de espera (hold)
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-500">
              {t.descripcion}
            </p>
          </div>
          <div className="text-right">
            <div
              className="font-bold leading-none tabular-nums"
              style={{
                fontSize: 'clamp(48px, 7vw, 84px)',
                color: '#F7941D',
                textShadow: '0 0 14px rgba(247,148,29,0.4)',
              }}
            >
              {t.segundos}
            </div>
            <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-[#F7941D]/80 mt-1">
              segundos
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Sin área conocida — mostrar las 3 opciones
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {Object.entries(TIEMPO_POR_AREA).map(([areaName, t], i) => {
        const color = ['#7c3aed', '#06b6d4', '#10b981'][i];
        return (
          <div
            key={areaName}
            className="rounded-xl p-4 border-2 transition-all hover:scale-[1.02]"
            style={{
              borderColor: `${color}55`,
              background: `${color}0d`,
              boxShadow: `0 0 12px ${color}26`,
            }}
          >
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] mb-1" style={{ color }}>
              {areaName}
            </p>
            <div
              className="font-bold tabular-nums leading-none mb-1"
              style={{ fontSize: 38, color, textShadow: `0 0 10px ${color}66` }}
            >
              {t.segundos}s
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">{t.descripcion}</p>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════
// CRITICALS CARD — grid de items críticos
// ════════════════════════════════════════
function CriticalsCard() {
  const criticals = CATEGORIAS.flatMap((cat) =>
    cat.items
      .filter((i) => i.tipo === 'CRITICO')
      .map((i) => ({ ...i, catNombre: cat.nombre, catColor: cat.color }))
  );

  return (
    <div className="rounded-xl p-4 border" style={{ borderColor: 'rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.04)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-[10px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 rounded"
          style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}
        >
          8 ítems críticos
        </span>
        <span className="text-[11px] text-gray-500 dark:text-gray-400">
          Fallar uno solo te descuelga del 100
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {criticals.map((c, i) => (
          <div
            key={c.nombre}
            className="flex items-start gap-2.5 p-2.5 rounded-lg border transition-all hover:translate-x-0.5"
            style={{
              borderColor: 'rgba(244,63,94,0.2)',
              background: 'rgba(244,63,94,0.03)',
            }}
          >
            <span
              className="font-mono text-[10px] flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded"
              style={{ color: '#f43f5e', background: 'rgba(244,63,94,0.12)' }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-gray-800 dark:text-gray-100 leading-tight">
                {c.nombre}
              </p>
              <p className="text-[10px] font-mono mt-0.5" style={{ color: c.catColor }}>
                {c.catNombre}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// MATRIX CARD — 3 columnas (mini-dashboard)
// ════════════════════════════════════════
function MatrixCard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
      {CATEGORIAS.map((cat) => (
        <div
          key={cat.key}
          className="rounded-xl p-4 border-2 relative overflow-hidden transition-all hover:-translate-y-0.5"
          style={{
            borderColor: `${cat.color}40`,
            background: `${cat.color}08`,
            boxShadow: `0 0 14px ${cat.color}22, inset 0 0 0 1px ${cat.color}20`,
          }}
        >
          {/* Línea neon arriba */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5"
            style={{
              background: `linear-gradient(90deg, transparent, ${cat.color}, transparent)`,
              boxShadow: `0 0 10px ${cat.color}`,
            }}
          />

          <div className="flex items-baseline justify-between mb-1">
            <p
              className="text-[10px] font-mono uppercase tracking-[0.2em] font-semibold"
              style={{ color: cat.color }}
            >
              {cat.nombre}
            </p>
            <span
              className="font-bold tabular-nums"
              style={{
                fontSize: 28,
                color: cat.color,
                textShadow: `0 0 12px ${cat.glow}`,
                lineHeight: 1,
              }}
            >
              {cat.peso}%
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">{cat.descripcion}</p>

          <ul className="space-y-1">
            {cat.items.map((it) => (
              <li key={it.nombre} className="flex items-center gap-2 text-[11px]">
                <span
                  className="w-1 h-1 rounded-full flex-shrink-0"
                  style={{
                    background: it.tipo === 'CRITICO' ? '#f43f5e' : cat.color,
                    boxShadow: it.tipo === 'CRITICO' ? '0 0 4px #f43f5e' : `0 0 3px ${cat.color}`,
                  }}
                />
                <span className="text-gray-700 dark:text-gray-300 truncate flex-1">{it.nombre}</span>
                {it.tipo === 'CRITICO' && (
                  <span
                    className="text-[8px] font-mono uppercase tracking-wider px-1 py-0 rounded"
                    style={{ color: '#f43f5e', background: 'rgba(244,63,94,0.12)' }}
                  >
                    CRIT
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export const QualityCard = memo(QualityCardImpl, (prev, next) => {
  if (!prev.meta && !next.meta) return true;
  if (!prev.meta || !next.meta) return false;
  return prev.meta.highlight === next.meta.highlight && prev.meta.area === next.meta.area;
});
