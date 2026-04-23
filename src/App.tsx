import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { ChatInput } from './components/ChatInput';
import { WelcomeScreen } from './components/WelcomeScreen';
import { SplashScreen } from './components/SplashScreen';
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
  const [splashDone, setSplashDone] = useState(false);

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
        body: JSON.stringify({ message: text.trim(), history }),
      });

      if (!response.ok || !response.body) throw new Error('Error en la respuesta');

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
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: 'Error al obtener respuesta. Intenta de nuevo.' }
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

  if (!splashDone) {
    return <SplashScreen onDone={() => setSplashDone(true)} />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1f35]">
        <div className="w-8 h-8 border-2 border-[#F7941D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={selectConversation}
        onNew={newConversation}
        onDelete={deleteConversation}
        onDeleteAll={deleteAllConversations}
        userEmail={user.email ?? ''}
        onLogout={() => supabase.auth.signOut()}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
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
            <img src="/mascot.png" alt="Windmar AI" className="w-7 h-7 object-contain" style={{ imageRendering: 'pixelated' }} />
            <span className="font-semibold text-[#1B3A5C] text-sm">Windmar AI</span>
          </div>
        </div>

        {activeConversation?.messages.length ? (
          <ChatWindow messages={activeConversation.messages} isStreaming={isStreaming} />
        ) : (
          <WelcomeScreen onSend={sendMessage} />
        )}
        <ChatInput onSend={sendMessage} disabled={isStreaming} />
      </main>
    </div>
  );
}
