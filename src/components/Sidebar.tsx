import { useState, useEffect } from 'react';
import type { Conversation } from '../types';

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
  userEmail: string;
  isOpen: boolean;
  onClose: () => void;
}

// Tips de venta y proceso para asesores Windmar Home
const SALES_TIPS = [
  '☀️ Para Roofing solo: financia WH Financial. Si combina con solar, abre Oriental.',
  '🏠 Lease es ideal para clientes nuevos sin sistema. Loan es mejor para ampliar.',
  '💧 Reverse Osmosis se paga solo en 2 años — familia gasta $1,200+ al año en botellas.',
  '🛡️ Plan Platinum incluye limpieza de techo y paneles cada 2 años por 10 años.',
  '🏦 EnFin va primero para Lease. Si declina, LightReach (Palmetto) como alternativa.',
  '⚡ Crédito Federal ITC 30% solo aplica al Loan. En Lease lo recibe LightReach/EnFin.',
  '📐 WH Financial mín. 4 placas. Oriental Bank mín. 8 placas.',
  '🔋 Cisterna Ecowater 500: 10 años garantía. Hércules 600: 5 años.',
  '☀️ Cliente paga >$200/mes en LUMA → candidato ideal para sistema completo.',
  '📅 Tu meta principal: agendar visita técnica esta misma semana.',
  '💰 Cash en Roofing tiene 10% descuento automático en WH Quote.',
  '🎯 Cliente VIP instalado: $1,000 descuento adicional en Roofing.',
];

export function Sidebar({ conversations, activeId, onSelect, onNew, onDelete, onDeleteAll, userEmail, isOpen, onClose }: Props) {
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * SALES_TIPS.length));
  const username = userEmail.split('@')[0];

  // Rotar tip cada 25 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % SALES_TIPS.length);
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  function handleClearAll() {
    if (confirmClearAll) {
      onDeleteAll();
      setConfirmClearAll(false);
    } else {
      setConfirmClearAll(true);
      setTimeout(() => setConfirmClearAll(false), 3000);
    }
  }

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 w-72 h-full flex flex-col
        bg-gradient-to-b from-[#e3edf7] via-[#dde8f5] to-[#d5e2f0]
        dark:from-[#0f1c2e] dark:via-[#0c1828] dark:to-[#0a1422]
        border-r border-[#b8cfe8] dark:border-white/[0.08]
        backdrop-blur-md
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:w-64 md:z-auto md:flex-shrink-0 md:h-full
      `}
      style={{
        boxShadow: '4px 0 24px rgba(27,58,92,0.08)',
      }}
    >

      {/* Logo */}
      <div className="p-4 border-b border-[#b8cfe8] dark:border-white/[0.08] flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center" style={{ width: 36, height: 36 }}>
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    'radial-gradient(circle, rgba(247,148,29,0.55) 0%, rgba(247,148,29,0.15) 50%, transparent 75%)',
                  filter: 'blur(6px)',
                }}
              />
              <img
                src="/sunbot.png"
                alt="Windmar AI"
                className="mascot-img relative z-10 w-9 h-9 object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <span className="font-bold text-[#1B3A5C] dark:text-white text-base leading-tight">Windmar AI</span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer p-1"
            aria-label="Cerrar menú"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <button
          onClick={onNew}
          className="w-full text-white rounded-lg py-2.5 px-3 text-sm font-semibold cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #1B3A5C 0%, #2a5a8c 100%)',
            boxShadow: '0 3px 10px rgba(27,58,92,0.4)',
          }}
        >
          + Nueva conversación
        </button>
      </div>

      {/* Bienvenida */}
      <div className="px-3 py-2.5 border-b border-[#b8cfe8] dark:border-white/[0.08] flex-shrink-0">
        <p className="text-sm font-semibold text-[#1B3A5C] dark:text-white">
          Bienvenido, {username}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
          Iniciaste sesión como
        </p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate font-medium">
          {userEmail}
        </p>
      </div>

      {/* Conversaciones — limitadas en altura para dejar espacio a tips/branding */}
      <div className="overflow-y-auto p-2 max-h-[35%] flex-shrink-0">
        {conversations.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-3 px-2">
            Sin conversaciones aún
          </p>
        ) : (
          conversations.map((conv) => (
            <div key={conv.id} className="group relative mb-1">
              <button
                onClick={() => onSelect(conv.id)}
                className={`w-full text-left rounded-lg px-3 py-2 pr-8 text-sm transition-colors cursor-pointer ${
                  activeId === conv.id
                    ? 'bg-white/70 dark:bg-orange-900/30 text-[#1B3A5C] dark:text-orange-300 font-semibold shadow-sm'
                    : 'text-[#1B3A5C] dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="truncate">{conv.title || 'Conversación'}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {new Date(conv.updatedAt).toLocaleDateString('es-PR', { month: 'short', day: 'numeric' })}
                </div>
              </button>
              <button
                onClick={() => onDelete(conv.id)}
                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1 cursor-pointer"
                title="Borrar conversación"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* TIPS ROTATIVOS — flex-1 llena el espacio disponible */}
      <div className="flex-1 flex flex-col min-h-0 px-4 py-4 border-t border-[#b8cfe8] dark:border-white/[0.08] overflow-hidden">
        <div className="flex items-center gap-1.5 mb-3 flex-shrink-0">
          <span className="text-sm">💡</span>
          <span className="text-xs font-bold uppercase tracking-widest text-[#F7941D]">
            Tip del día
          </span>
        </div>

        {/* Tip text con animación de fade */}
        <div className="flex-1 flex items-center min-h-0 overflow-hidden">
          <p
            key={tipIndex}
            className="text-[14px] leading-relaxed text-[#1B3A5C] dark:text-gray-200 italic font-medium"
            style={{
              animation: 'fadeInTip 0.5s ease-in-out',
            }}
          >
            "{SALES_TIPS[tipIndex]}"
          </p>
        </div>

        {/* Indicador de dots */}
        <div className="flex items-center justify-center gap-1 mt-2 flex-shrink-0">
          {SALES_TIPS.slice(0, 5).map((_, i) => {
            // Mostrar 5 dots representando 5 grupos
            const groupIdx = Math.floor((tipIndex / SALES_TIPS.length) * 5);
            return (
              <div
                key={i}
                className={`rounded-full transition-all ${
                  i === groupIdx ? 'w-3 h-1.5 bg-[#F7941D]' : 'w-1.5 h-1.5 bg-gray-300 dark:bg-gray-600'
                }`}
              />
            );
          })}
        </div>

        <style>{`
          @keyframes fadeInTip {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>

      {/* BRANDING — Mini SUN BOT + tagline */}
      <div className="flex items-center justify-center gap-2 px-3 py-2.5 border-t border-[#b8cfe8] dark:border-white/[0.08] flex-shrink-0">
        <div className="relative flex items-center justify-center" style={{ width: 28, height: 28 }}>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(247,148,29,0.5) 0%, rgba(247,148,29,0.1) 50%, transparent 75%)',
              filter: 'blur(4px)',
            }}
          />
          <img
            src="/sunbot.png"
            alt="Windmar"
            className="mascot-img relative z-10 w-7 h-7 object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] font-bold text-[#1B3A5C] dark:text-white">Windmar Home PR</span>
          <span className="text-[9px] text-gray-500 dark:text-gray-400">22 años de experiencia</span>
        </div>
      </div>

      {/* PAPELERA — botón con ícono visible */}
      <div className="px-3 py-3 border-t border-[#b8cfe8] dark:border-white/[0.08] flex-shrink-0">
        {conversations.length > 0 ? (
          <button
            onClick={handleClearAll}
            className={`w-full flex items-center justify-center gap-2 text-xs py-2 rounded-lg transition-all cursor-pointer ${
              confirmClearAll
                ? 'bg-red-500 text-white font-medium'
                : 'text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-300 dark:hover:border-red-900/40'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
            <span>{confirmClearAll ? '¿Confirmar? Clic de nuevo' : 'Borrar todo el historial'}</span>
          </button>
        ) : (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center py-1 italic">
            Tus conversaciones aparecerán aquí
          </p>
        )}
      </div>
    </aside>
  );
}
