import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { ChatInput } from './components/ChatInput';
import { WelcomeScreen } from './components/WelcomeScreen';
import { MascotPanel } from './components/MascotPanel';
import { TopBar } from './components/TopBar';
import { ProfileModal } from './components/ProfileModal';
import type { MascotState } from './components/MascotPanel';
import type { Message, Conversation } from './types';
import type { User } from '@supabase/supabase-js';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Por defecto sidebar cerrada — se persiste en localStorage
  const [desktopSidebarHidden, setDesktopSidebarHidden] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('wh-sidebar-hidden');
    return saved === null ? true : saved === 'true';
  });
  const [mascotState, setMascotState] = useState<MascotState>('idle');
  const [postLoginLoading, setPostLoginLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  // Versión bump al guardar perfil para forzar re-lectura de metadata
  const [profileVersion, setProfileVersion] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem('wh-sidebar-hidden', String(desktopSidebarHidden));
    } catch {}
  }, [desktopSidebarHidden]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Refresca user después de guardar perfil
  useEffect(() => {
    if (profileVersion === 0) return;
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) setUser(u);
    });
  }, [profileVersion]);

  // Metadata helpers
  const meta = (user?.user_metadata ?? {}) as { display_name?: string; departamento?: string; rol?: string };
  const displayName = meta.display_name || (user?.email ?? '').split('@')[0].split('.')[0];
  const capDisplayName = displayName ? displayName.charAt(0).toUpperCase() + displayName.slice(1) : 'asesor';

  // Cuando el usuario hace login fresco (desde LoginScreen), muestra loader 2s
  useEffect(() => {
    if (!user) return;
    try {
      if (sessionStorage.getItem('wh-just-logged-in') === '1') {
        sessionStorage.removeItem('wh-just-logged-in');
        setPostLoginLoading(true);
        const t = setTimeout(() => setPostLoginLoading(false), 2000);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setActiveId(null);
      return;
    }
    loadConversations();
  }, [user]);

  async function loadConversations() {
    const { data: convs } = await supabase
      .from('conversations')
      .select('id, title, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (!convs) return;

    const full: Conversation[] = await Promise.all(
      convs.map(async (c) => {
        const { data: msgs } = await supabase
          .from('messages')
          .select('id, role, content, created_at')
          .eq('conversation_id', c.id)
          .order('created_at', { ascending: true });

        return {
          id: c.id as string,
          title: c.title as string,
          createdAt: new Date(c.created_at as string),
          updatedAt: new Date(c.updated_at as string),
          messages: (msgs ?? []).map((m) => ({
            id: m.id as string,
            role: m.role as 'user' | 'assistant',
            content: m.content as string,
            timestamp: new Date(m.created_at as string),
          })),
        };
      })
    );
    setConversations(full);
  }

  // Drive mascot state from streaming
  useEffect(() => {
    if (isStreaming) {
      setMascotState('thinking');
    } else {
      // Detecta si la última respuesta es un error
      const lastMsg = activeConversation?.messages[activeConversation.messages.length - 1];
      if (lastMsg?.role === 'assistant' && lastMsg.content.includes('[ERROR_TYPE:')) {
        setMascotState('error');
        const t = setTimeout(() => setMascotState('idle'), 4500);
        return () => clearTimeout(t);
      }
      setMascotState('happy');
      const t = setTimeout(() => setMascotState('idle'), 3500);
      return () => clearTimeout(t);
    }
  }, [isStreaming]);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  async function newConversation() {
    setActiveId(null);
    setSidebarOpen(false);
  }

  async function selectConversation(id: string) {
    setActiveId(id);
    setSidebarOpen(false);
  }

  async function deleteConversation(id: string) {
    await supabase.from('messages').delete().eq('conversation_id', id);
    await supabase.from('conversations').delete().eq('id', id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  }

  async function deleteAllConversations() {
    for (const conv of conversations) {
      await supabase.from('messages').delete().eq('conversation_id', conv.id);
    }
    await supabase.from('conversations').delete().eq('user_id', user!.id);
    setConversations([]);
    setActiveId(null);
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming || !user) return;

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    let convId = activeId;

    if (!convId) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ title: text.slice(0, 60), user_id: user.id })
        .select('id')
        .single();

      if (!newConv) return;
      convId = newConv.id as string;

      const newConversation: Conversation = {
        id: convId,
        title: text.slice(0, 60),
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setConversations((prev) => [newConversation, ...prev]);
      setActiveId(convId);
    }

    await supabase.from('messages').insert({
      conversation_id: convId,
      role: 'user',
      content: text.trim(),
    });

    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId ? { ...c, messages: [...c.messages, userMsg] } : c
      )
    );

    const assistantMsgId = generateId();
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId ? { ...c, messages: [...c.messages, assistantMsg] } : c
      )
    );

    setIsStreaming(true);

    try {
      const currentConv = conversations.find((c) => c.id === convId);
      const history = (currentConv?.messages ?? []).slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history,
          email: user?.email ?? '',
          displayName: meta.display_name ?? '',
          departamento: meta.departamento ?? '',
          rol: meta.rol ?? '',
        }),
      });

      if (!response.ok) {
        // Intenta parsear error JSON con tipo
        let errorType = 'unknown';
        let errorMessage = 'Algo inesperado pasó. Intenta de nuevo.';
        let retryAfterSeconds: number | undefined;
        try {
          const errBody = await response.json();
          errorType = errBody.errorType ?? 'unknown';
          errorMessage = errBody.error ?? errorMessage;
          retryAfterSeconds = errBody.retryAfterSeconds;
        } catch { /* ignore parse errors */ }

        const retryHint = retryAfterSeconds
          ? `\n\n⏱️ Espera ~${retryAfterSeconds} segundos antes de reintentar.`
          : '';

        const friendlyMessage = `🤖 ¡Ay, perdona ${capDisplayName}! ${errorMessage}${retryHint}\n\n[ERROR_TYPE:${errorType}]`;

        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsgId ? { ...m, content: friendlyMessage } : m
                  ),
                }
              : c
          )
        );
        setIsStreaming(false);
        return;
      }

      if (!response.body) throw new Error('Sin cuerpo de respuesta');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsgId ? { ...m, content: fullText } : m
                  ),
                }
              : c
          )
        );
      }

      await supabase.from('messages').insert({
        conversation_id: convId,
        role: 'assistant',
        content: fullText,
      });

      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', convId);

    } catch {
      const friendlyMessage = `🤖 ¡Ay, perdona ${capDisplayName}! Parece que hay un problema de conexión. Verifica tu internet e intenta de nuevo.\n\n[ERROR_TYPE:network]`;

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: friendlyMessage }
                    : m
                ),
              }
            : c
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-[#F7941D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  // Loader breve después de iniciar sesión
  if (postLoginLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#eef4fa] dark:bg-[#0a1628] px-4">
        {/* SUN BOT cargando con halo respirando */}
        <div className="relative flex items-center justify-center mb-5" style={{ width: 100, height: 100 }}>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(247,148,29,0.6) 0%, rgba(247,148,29,0.2) 50%, transparent 75%)',
              filter: 'blur(14px)',
              animation: 'haloBreathe 1.6s ease-in-out infinite',
            }}
          />
          <img
            src="/sunbot-cargando.png"
            alt="Windmar AI cargando"
            className="mascot-img relative z-10 w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-lg"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* Saludo personalizado */}
        <p className="text-lg sm:text-xl font-bold text-[#1B3A5C] dark:text-white mb-1">
          ¡Hola, {capDisplayName}! 👋
        </p>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-5">
          Preparando tu asistente...
        </p>

        {/* 3 puntos animados */}
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full bg-[#F7941D]"
            style={{ animation: 'dotBounce 1.2s ease-in-out 0s infinite' }}
          />
          <span
            className="w-2.5 h-2.5 rounded-full bg-[#F7941D]"
            style={{ animation: 'dotBounce 1.2s ease-in-out 0.2s infinite' }}
          />
          <span
            className="w-2.5 h-2.5 rounded-full bg-[#F7941D]"
            style={{ animation: 'dotBounce 1.2s ease-in-out 0.4s infinite' }}
          />
        </div>

        <style>{`
          @keyframes haloBreathe {
            0%, 100% { opacity: 0.55; transform: scale(1); }
            50%       { opacity: 1; transform: scale(1.15); }
          }
          @keyframes dotBounce {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
            40%            { transform: translateY(-8px); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#eef4fa] dark:bg-[#0a1628] overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`${desktopSidebarHidden ? 'md:hidden' : 'md:flex md:h-full'}`}>
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={selectConversation}
          onNew={newConversation}
          onDelete={deleteConversation}
          onDeleteAll={deleteAllConversations}
          userEmail={user.email ?? ''}
          displayName={meta.display_name}
          departamento={meta.departamento}
          rol={meta.rol}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Desktop sidebar toggle — sin fondo, solo ícono con halo + animación sutil */}
      <button
        onClick={() => setDesktopSidebarHidden(!desktopSidebarHidden)}
        className={`hidden md:flex fixed z-40 top-1/2 -translate-y-1/2 w-9 h-9 items-center justify-center transition-all duration-300 cursor-pointer group ${
          desktopSidebarHidden ? 'left-3' : 'left-[244px]'
        }`}
        title={desktopSidebarHidden ? 'Mostrar conversaciones' : 'Ocultar conversaciones'}
        aria-label={desktopSidebarHidden ? 'Mostrar conversaciones' : 'Ocultar conversaciones'}
      >
        {/* Halo naranja con respiración (pulse) */}
        <div
          className="absolute inset-0 rounded-full group-hover:opacity-100 transition-opacity"
          style={{
            background: 'radial-gradient(circle, rgba(247,148,29,0.55) 0%, rgba(247,148,29,0.15) 50%, transparent 75%)',
            filter: 'blur(6px)',
            animation: 'haloPulse 2.4s ease-in-out infinite',
          }}
        />
        {/* Ícono con micro-bounce */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="relative z-10 text-[#F7941D] group-hover:text-[#e8830d] group-hover:scale-125 transition-transform"
          style={{
            filter: 'drop-shadow(0 0 3px rgba(247,148,29,0.6))',
            animation: desktopSidebarHidden ? 'arrowNudgeRight 2.4s ease-in-out infinite' : 'arrowNudgeLeft 2.4s ease-in-out infinite',
          }}
        >
          {desktopSidebarHidden ? (
            <polyline points="9 18 15 12 9 6"/>
          ) : (
            <polyline points="15 18 9 12 15 6"/>
          )}
        </svg>

        {/* Animaciones */}
        <style>{`
          @keyframes haloPulse {
            0%, 100% { opacity: 0.5; transform: scale(0.95); }
            50%       { opacity: 1; transform: scale(1.15); }
          }
          @keyframes arrowNudgeRight {
            0%, 100% { transform: translateX(0); }
            50%       { transform: translateX(3px); }
          }
          @keyframes arrowNudgeLeft {
            0%, 100% { transform: translateX(0); }
            50%       { transform: translateX(-3px); }
          }
        `}</style>
      </button>

      <TopBar
        onLogout={() => supabase.auth.signOut()}
        onOpenProfile={() => setProfileOpen(true)}
        displayName={meta.display_name}
      />

      {profileOpen && (
        <ProfileModal
          user={user}
          onClose={() => setProfileOpen(false)}
          onSaved={() => setProfileVersion((v) => v + 1)}
        />
      )}

      {/* Mascota SUN BOT bottom-left con estados dinámicos */}
      <MascotPanel state={mascotState} sidebarHidden={desktopSidebarHidden} />

      {/* Copyright sutil abajo y centrado */}
      <div className="fixed bottom-1 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none">
        <p className="text-[9px] text-gray-400/35 dark:text-gray-500/35 tracking-wider">
          © Juan Sebastian Rivera · {new Date().getFullYear()}
        </p>
      </div>

      {/* Main — padded left on desktop to give room to mascot */}
      <main className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${desktopSidebarHidden ? 'md:pl-16' : 'md:pl-28'}`}>
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-[#b8cfe8] dark:border-gray-700 bg-[#eef4fa] dark:bg-[#0f1c2e] flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-[#1B3A5C] transition-colors cursor-pointer"
            aria-label="Abrir menú"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <img src="/sunbot.png" alt="Windmar AI" className="mascot-img w-7 h-7 object-contain" style={{ imageRendering: 'pixelated' }} />
            <span className="font-semibold text-[#1B3A5C] dark:text-white text-sm">Windmar AI</span>
          </div>
        </div>

        {activeConversation?.messages.length ? (
          <>
            <ChatWindow
              messages={activeConversation.messages}
              isStreaming={isStreaming}
              userEmail={user.email ?? ''}
            />
            <ChatInput
              onSend={sendMessage}
              disabled={isStreaming}
              onTypingChange={(typing) => {
                if (!isStreaming) setMascotState(typing ? 'typing' : 'idle');
              }}
            />
          </>
        ) : (
          <WelcomeScreen
            onSend={sendMessage}
            disabled={isStreaming}
            onTypingChange={(typing) => {
              if (!isStreaming) setMascotState(typing ? 'typing' : 'idle');
            }}
          />
        )}
      </main>
    </div>
  );
}
