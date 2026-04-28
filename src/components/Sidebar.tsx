import { useState } from 'react';
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

export function Sidebar({ conversations, activeId, onSelect, onNew, onDelete, onDeleteAll, userEmail, isOpen, onClose }: Props) {
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const username = userEmail.split('@')[0];

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
    <aside className={`
      fixed inset-y-0 left-0 z-50 w-72 bg-[#dde8f5] dark:bg-[#0f1c2e] border-r border-[#b8cfe8] dark:border-gray-700 flex flex-col
      transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      md:relative md:translate-x-0 md:w-64 md:z-auto md:flex-shrink-0
    `}>

      {/* Logo */}
      <div className="p-4 border-b border-[#b8cfe8] dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <img src="/sunbot.png" alt="Windmar AI" className="mascot-img w-8 h-8 object-contain" style={{ imageRendering: 'pixelated' }} />
            <span className="font-semibold text-[#1B3A5C] dark:text-white text-sm leading-tight">Windmar AI</span>
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
      <div className="px-3 py-2.5 border-b border-[#b8cfe8] dark:border-gray-700">
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

      {/* Conversaciones */}
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p className="text-xs text-gray-400 text-center mt-6 px-2">Sin conversaciones aún</p>
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

      {conversations.length > 0 && (
        <div className="p-2 border-t border-[#b8cfe8] dark:border-gray-700">
          <button
            onClick={handleClearAll}
            className={`w-full text-xs py-1.5 rounded-lg transition-colors cursor-pointer ${
              confirmClearAll
                ? 'bg-red-500 text-white'
                : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
            }`}
          >
            {confirmClearAll ? '¿Confirmar? Clic para borrar todo' : '🗑 Borrar todo el historial'}
          </button>
        </div>
      )}
    </aside>
  );
}
