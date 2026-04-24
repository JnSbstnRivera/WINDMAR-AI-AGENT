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
      fixed inset-y-0 left-0 z-50 w-72 bg-[#f8f9fa] border-r border-gray-200 flex flex-col
      transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      md:relative md:translate-x-0 md:w-64 md:z-auto md:flex-shrink-0
    `}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <img src="/mascot.png" alt="Windmar AI" className="w-8 h-8 object-contain" style={{ imageRendering: 'pixelated' }} />
            <span className="font-semibold text-[#1B3A5C] text-sm leading-tight">Windmar AI</span>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="md:hidden text-gray-400 hover:text-gray-600 transition-colors cursor-pointer p-1"
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
          className="w-full bg-[#1B3A5C] hover:bg-[#152e4a] text-white rounded-lg py-2 px-3 text-sm font-medium transition-colors cursor-pointer"
        >
          + Nueva conversación
        </button>
      </div>

      <div className="px-3 py-2 border-b border-gray-200">
        <p className="text-xs text-gray-400 truncate">{userEmail}</p>
      </div>

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
                    ? 'bg-orange-100 text-[#1B3A5C] font-medium'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <div className="truncate">{conv.title || 'Conversación'}</div>
                <div className="text-xs text-gray-400 mt-0.5">
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
        <div className="p-2 border-t border-gray-200">
          <button
            onClick={handleClearAll}
            className={`w-full text-xs py-1.5 rounded-lg transition-colors cursor-pointer ${
              confirmClearAll
                ? 'bg-red-500 text-white'
                : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
            }`}
          >
            {confirmClearAll ? '¿Confirmar? Clic para borrar todo' : '🗑 Borrar todo el historial'}
          </button>
        </div>
      )}
    </aside>
  );
}
