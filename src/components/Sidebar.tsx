import type { Conversation } from '../types';

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  userEmail: string;
  onLogout: () => void;
}

export function Sidebar({ conversations, activeId, onSelect, onNew, userEmail, onLogout }: Props) {
  return (
    <aside className="w-64 bg-[#f8f9fa] border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <svg width="28" height="28" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="40" fill="#F7941D" />
            <path
              d="M40 12 L44 27 L60 27 L47 36 L52 51 L40 42 L28 51 L33 36 L20 27 L36 27 Z"
              fill="white"
            />
          </svg>
          <span className="font-semibold text-[#1B3A5C] text-sm leading-tight">
            Windmar AI
          </span>
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
        <button
          onClick={onLogout}
          className="text-xs text-red-400 hover:text-red-600 transition-colors cursor-pointer mt-0.5"
        >
          Cerrar sesión
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p className="text-xs text-gray-400 text-center mt-6 px-2">
            Sin conversaciones aún
          </p>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full text-left rounded-lg px-3 py-2 mb-1 text-sm transition-colors cursor-pointer ${
                activeId === conv.id
                  ? 'bg-orange-100 text-[#1B3A5C] font-medium'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="truncate">{conv.title || 'Conversación'}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {new Date(conv.updatedAt).toLocaleDateString('es-PR', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
