'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { ChatWindow } from './ChatWindow';
import { ChatInput } from './ChatInput';
import { WelcomeScreen } from './WelcomeScreen';
import { MascotPanel, type MascotState } from './MascotPanel';
import { TopBar } from './TopBar';
import { ProfileModal } from './ProfileModal';
import { WindmarInvaders } from './WindmarInvaders';
import { WindmarSnake } from './WindmarSnake';
import { WindmarPong } from './WindmarPong';
import { FollowUpEmailModal } from './FollowUpEmailModal';
import { buildAsesorCargo } from '@/lib/email-templates';
import { ClientCard } from './ClientCard';
import type { ZohoClientFull } from '@/lib/zoho';
import { SUNBOT_ART, TEMBLOR_TEXT, ABOUT_TEXT } from '@/lib/easter-eggs';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';
import type { Message, Conversation, ToolRef, QualityMeta } from '@/types';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Extrae el bloque <quick_replies>...</quick_replies> del texto del LLM.
 * Devuelve { cleanText, replies }. Si no hay bloque, replies = [].
 * Tolera variantes: con/sin guiones, con bullets, líneas vacías.
 */
function extractQuickReplies(text: string): { cleanText: string; replies: string[] } {
  const re = /<quick_replies>\s*([\s\S]*?)\s*<\/quick_replies>/i;
  const match = text.match(re);
  if (!match) return { cleanText: text, replies: [] };
  const inner = match[1];
  const replies = inner
    .split('\n')
    .map((l) => l.replace(/^[\s\-*•]+/, '').trim())
    .filter((l) => l.length > 0 && l.length < 100)
    .slice(0, 3);
  const cleanText = text.replace(re, '').trim();
  return { cleanText, replies };
}

/**
 * Filtra las herramientas recomendadas por el server para quedarnos SOLO con
 * las que el LLM realmente mencionó en su respuesta (como link markdown
 * o por URL exacta). Esto elimina falsos positivos del trigger matching
 * — si el bot no nombra la herramienta, no aparece como card.
 *
 * Bonus: refuerza la regla del prompt "cuando menciones una herramienta usa
 * [Nombre](url)". Si el LLM olvida el link, no se muestra card → incentivo
 * a respetar el formato.
 */
function filterToolsMentionedInText(tools: ToolRef[], text: string): ToolRef[] {
  if (!text || tools.length === 0) return [];
  return tools.filter((t) => {
    // Match por URL completa o por nombre exacto entre corchetes [Nombre]
    if (text.includes(t.url)) return true;
    // Match alternativo: el nombre del tool en formato markdown link [Name](
    if (text.includes(`[${t.name}](`)) return true;
    return false;
  });
}

interface UserData {
  email: string;
  displayName: string | null;
  departamento: string | null;
  rol: string | null;
  /** Foto de perfil de Microsoft 365 (data URI base64) o null si no la tiene. */
  photoUrl?: string | null;
  /** Nombre formal del SSO (Juan Rivera) — usado en firmas de correo. */
  formalName?: string | null;
}

interface Props {
  user: UserData;
  onSignOut: () => Promise<void>;
}

export function ChatApp({ user, onSignOut }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarHidden, setDesktopSidebarHidden] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('wh-sidebar-hidden');
    return saved === null ? true : saved === 'true';
  });
  const [mascotState, setMascotState] = useState<MascotState>('idle');
  const [profileOpen, setProfileOpen] = useState(false);
  const [postLoginLoading, setPostLoginLoading] = useState(false);
  const [invadersOpen, setInvadersOpen] = useState(false);
  const [snakeOpen, setSnakeOpen] = useState(false);
  const [pongOpen, setPongOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  // Resultado de búsqueda en Zoho — null = cerrado / ZohoClientFull = card visible
  const [zohoClient, setZohoClient] = useState<ZohoClientFull | null>(null);
  const [zohoLoading, setZohoLoading] = useState(false);
  const [zohoError, setZohoError] = useState<string | null>(null);

  // AbortController para poder cortar el fetch del streaming desde el botón "detener".
  // Lo guardamos en ref para que persista entre renders sin disparar re-renders.
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-logout por inactividad: tras 15 min sin actividad (movimiento de mouse,
  // teclado, click, scroll, touch), cierra la sesión automáticamente.
  // 1 minuto antes muestra warning para que el asesor pueda quedarse si está activo.
  const { showWarning: showInactivityWarning } = useInactivityLogout({
    timeoutMs: 15 * 60 * 1000, // 15 minutos
    warningMs: 60 * 1000,       // último minuto = warning visible
    onTimeout: () => {
      onSignOut().catch(() => window.location.href = '/login');
    },
  });

  function stopStreaming() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }

  /**
   * Regenera el último mensaje del asistente.
   * Estrategia:
   *  1. Encuentra el último mensaje del asistente en la conversación activa
   *  2. Encuentra el último mensaje del USUARIO anterior a ese
   *  3. Borra el mensaje del asistente del state (visible) Y de Supabase (persistente)
   *  4. Llama sendMessage() con el mismo prompt del usuario para regenerar
   */
  async function regenerateLastResponse() {
    if (isStreaming || !activeId) return;

    const conv = conversations.find((c) => c.id === activeId);
    if (!conv || conv.messages.length < 2) return;

    // Última respuesta de asistente
    const lastAssistantIdx = [...conv.messages].reverse().findIndex((m) => m.role === 'assistant');
    if (lastAssistantIdx === -1) return;
    const assistantIdx = conv.messages.length - 1 - lastAssistantIdx;
    const assistantMsg = conv.messages[assistantIdx];

    // Último mensaje de usuario ANTES de esa respuesta
    let userMsg: Message | null = null;
    for (let i = assistantIdx - 1; i >= 0; i--) {
      if (conv.messages[i].role === 'user') {
        userMsg = conv.messages[i];
        break;
      }
    }
    if (!userMsg) return;

    // 1) Borrar mensaje del asistente del state local
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, messages: c.messages.filter((m) => m.id !== assistantMsg.id) }
          : c
      )
    );

    // 2) Borrar de Supabase (best-effort, no bloqueamos UI si falla).
    // El servidor borra el ÚLTIMO mensaje del asistente de esa conversación.
    fetch(`/api/messages?conversation_id=${encodeURIComponent(activeId)}&role=assistant`, {
      method: 'DELETE',
    }).catch(() => {/* ignorar — el state local ya está limpio */});

    // 3) Regenerar llamando a sendMessage con el prompt original.
    // Como sendMessage agrega un nuevo userMsg al state, primero lo quitamos
    // del state para evitar duplicarlo — y luego sendMessage lo re-añadirá.
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, messages: c.messages.filter((m) => m.id !== userMsg!.id) }
          : c
      )
    );

    // setTimeout 0 garantiza que React procese los setState anteriores
    // (limpieza del state) ANTES de que sendMessage lea conversations.
    const prompt = userMsg.content;
    setTimeout(() => sendMessage(prompt), 0);
  }

  const displayName = user.displayName || user.email.split('@')[0].split('.')[0];
  const capDisplayName = displayName ? displayName.charAt(0).toUpperCase() + displayName.slice(1) : 'asesor';
  // Cargo formateado para la firma del correo (ej: "Asesor de soluciones / Ventas")
  const asesorCargo = buildAsesorCargo(user.rol, user.departamento);

  useEffect(() => {
    try {
      localStorage.setItem('wh-sidebar-hidden', String(desktopSidebarHidden));
    } catch {}
  }, [desktopSidebarHidden]);

  // Loader breve después de iniciar sesión
  useEffect(() => {
    try {
      if (sessionStorage.getItem('wh-just-logged-in') === '1') {
        sessionStorage.removeItem('wh-just-logged-in');
        setPostLoginLoading(true);
        const t = setTimeout(() => setPostLoginLoading(false), 2000);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      if (!res.ok) return;
      const data = await res.json() as { conversations: Conversation[] };
      // Convertir strings a Date
      const convs: Conversation[] = data.conversations.map(c => ({
        ...c,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
        messages: c.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })),
      }));
      setConversations(convs);
    } catch (err) {
      console.error('[loadConversations]', err);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  // Driver del estado del SUN BOT
  useEffect(() => {
    if (isStreaming) {
      setMascotState('thinking');
    } else {
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
  }, [isStreaming, activeConversation]);

  function newConversation() {
    setActiveId(null);
    setSidebarOpen(false);
  }

  function selectConversation(id: string) {
    setActiveId(id);
    setSidebarOpen(false);
  }

  async function deleteConversation(id: string) {
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  }

  async function deleteAllConversations() {
    await fetch('/api/conversations', { method: 'DELETE' });
    setConversations([]);
    setActiveId(null);
  }

  /**
   * Handler para upload de CUALQUIER documento (foto o PDF).
   * Acepta texto adicional opcional (estilo GPT: archivo + mensaje juntos).
   *
   * Si el asesor escribe texto, el bot cumple ese pedido sobre el documento
   * (ej. "extrae los datos", "¿quién es el titular?", "dime el monto").
   * Si no escribe nada, el bot detecta el tipo de documento (factura LUMA,
   * ID, cotización, contrato, etc.) y extrae datos automáticamente.
   *
   * 1. Inserta un mensaje "USER" con el archivo (+ texto si hay)
   * 2. Llama POST /api/upload-document con FormData
   * 3. Inserta la respuesta del asistente con el análisis y tools
   */
  async function uploadDocument(file: File, userMessage?: string) {
    if (isStreaming) return;

    let convId = activeId;
    // Crear conversación si no hay una activa — título genérico basado en archivo
    if (!convId) {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Documento · ' + file.name.slice(0, 40) }),
      });
      if (!res.ok) return;
      const { conversation } = await res.json() as { conversation: Conversation };
      convId = conversation.id;
      const newConv: Conversation = {
        ...conversation,
        createdAt: new Date(conversation.createdAt),
        updatedAt: new Date(conversation.updatedAt),
        messages: [],
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveId(convId);
    }

    // Mensaje del usuario representando el archivo + texto opcional
    // Sin texto: el bot detecta tipo de documento automáticamente
    const userContent = userMessage
      ? `📎 **${file.name}** (${Math.round(file.size / 1024)} KB)\n\n${userMessage}`
      : `📎 Adjunté: **${file.name}** (${Math.round(file.size / 1024)} KB)`;
    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: userContent,
      timestamp: new Date(),
    };
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, userMsg] } : c))
    );
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: convId, role: 'user', content: userMsg.content }),
    });

    // Placeholder del asistente mientras procesa
    const assistantMsgId = generateId();
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, assistantMsg] } : c))
    );
    setIsStreaming(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (convId) formData.append('conversation_id', convId);
      if (userMessage) formData.append('additional_message', userMessage);

      const res = await fetch('/api/upload-document', { method: 'POST', body: formData });
      const data = await res.json() as { text?: string; error?: string };

      if (!res.ok || !data.text) {
        const errMsg = data.error || 'No se pudo procesar el archivo';
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: `🤖 ¡Ay, perdona! ${errMsg}` }
                      : m
                  ),
                }
              : c
          )
        );
        return;
      }

      // Extraer quick replies del texto
      const { cleanText, replies: quickReplies } = extractQuickReplies(data.text);

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: cleanText,
                        ...(quickReplies.length > 0 ? { quickReplies } : {}),
                      }
                    : m
                ),
              }
            : c
        )
      );
    } catch (err) {
      console.error('[uploadDocument]', err);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: '🤖 Error de conexión al procesar el archivo.' }
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

  /**
   * Inserta una respuesta estática del asistente sin llamar al LLM.
   * Útil para easter eggs tipo /sunbot, /temblor, /sobre — el texto está
   * predefinido en lib/easter-eggs.ts. NO gasta tokens.
   */
  async function insertStaticReply(staticText: string) {
    let convId = activeId;
    if (!convId) {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '🎮 Easter egg' }),
      });
      if (!res.ok) return;
      const { conversation } = await res.json() as { conversation: Conversation };
      convId = conversation.id;
      const newConv: Conversation = {
        ...conversation,
        createdAt: new Date(conversation.createdAt),
        updatedAt: new Date(conversation.updatedAt),
        messages: [],
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveId(convId);
    }
    const assistantMsg: Message = {
      id: generateId(),
      role: 'assistant',
      content: staticText,
      timestamp: new Date(),
    };
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, assistantMsg] } : c))
    );
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: convId, role: 'assistant', content: staticText }),
    });
  }

  /**
   * Busca un cliente en Zoho CRM y abre el ClientCard inline.
   * Acepta email, teléfono o nombre como query.
   */
  async function searchZohoClient(query: string) {
    setZohoError(null);
    setZohoLoading(true);
    setZohoClient(null);
    try {
      const res = await fetch(`/api/zoho/client?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) {
        setZohoError(data.error || 'Error consultando Zoho');
        return;
      }
      if (!data.found) {
        setZohoError(data.message || `No se encontró "${query}" en Zoho`);
        return;
      }
      setZohoClient(data as ZohoClientFull);
    } catch {
      setZohoError('Error de conexión con Zoho');
    } finally {
      setZohoLoading(false);
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return;

    // ════════════════════════════════════════
    // EASTER EGGS — comandos secretos del chat
    // ════════════════════════════════════════
    // Comandos interceptados en cliente — NO gastan tokens del LLM.
    // Juegos: abren componente inline. Estáticos: insertan respuesta predefinida.
    const cmd = text.trim().toLowerCase();
    // Juegos interactivos
    if (cmd === '/invaders' || cmd === '/juego' || cmd === '/space' || cmd === '/play') {
      setInvadersOpen(true);
      return;
    }
    if (cmd === '/snake' || cmd === '/serpiente') {
      setSnakeOpen(true);
      return;
    }
    if (cmd === '/pong') {
      setPongOpen(true);
      return;
    }
    // Comando de productividad: abre el modal de correo de seguimiento.
    // El bot NO se involucra — es solo UI que llama Graph API directo.
    // Aliases: /@ es atajo rápido (símbolo natural de correo).
    if (
      cmd === '/@' ||
      cmd === '/seguimiento' ||
      cmd === '/correos' ||
      cmd === '/correo' ||
      cmd === '/email' ||
      cmd === '/followup'
    ) {
      setFollowUpOpen(true);
      return;
    }

    // Comando Zoho: /cliente {email|teléfono|nombre}
    // Busca el cliente en Zoho CRM y muestra ClientCard con coach IA.
    if (cmd.startsWith('/cliente ') || cmd.startsWith('/zoho ')) {
      const query = text.trim().split(/\s+/).slice(1).join(' ');
      if (!query || query.length < 3) {
        setZohoError('Escribe el comando seguido del email, teléfono o nombre. Ej: /cliente maria@correo.com');
        return;
      }
      searchZohoClient(query);
      return;
    }
    // Respuestas estáticas (insertadas como mensaje del asistente, sin LLM)
    if (cmd === '/sunbot' || cmd === '/bot') {
      await insertStaticReply(SUNBOT_ART);
      return;
    }
    if (cmd === '/temblor' || cmd === '/sismo' || cmd === '/terremoto') {
      await insertStaticReply(TEMBLOR_TEXT);
      return;
    }
    if (cmd === '/sobre' || cmd === '/about' || cmd === '/help' || cmd === '/?') {
      await insertStaticReply(ABOUT_TEXT);
      return;
    }

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    let convId = activeId;

    // Crear conversación si no hay activa
    if (!convId) {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: text.slice(0, 60) }),
      });
      if (!res.ok) return;
      const { conversation } = await res.json() as { conversation: Conversation };
      convId = conversation.id;

      const newConv: Conversation = {
        ...conversation,
        createdAt: new Date(conversation.createdAt),
        updatedAt: new Date(conversation.updatedAt),
        messages: [],
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveId(convId);
    }

    // Guardar mensaje del usuario
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: convId, role: 'user', content: text.trim() }),
    });

    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, userMsg] } : c))
    );

    const assistantMsgId = generateId();
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, assistantMsg] } : c))
    );

    setIsStreaming(true);

    try {
      const currentConv = conversations.find((c) => c.id === convId);
      const history = (currentConv?.messages ?? []).slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Crear nuevo AbortController para este request — permite cortar con botón "detener"
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), history }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        let errorType = 'unknown';
        let errorMessage = 'Algo inesperado pasó. Intenta de nuevo.';
        let retryAfterSeconds: number | undefined;
        try {
          const errBody = await response.json();
          errorType = errBody.errorType ?? 'unknown';
          errorMessage = errBody.error ?? errorMessage;
          retryAfterSeconds = errBody.retryAfterSeconds;
        } catch { /* ignore */ }

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

      // Extraer header con herramientas recomendadas (lo pone /api/chat).
      // Se aplica al mensaje cuando termine el stream, no durante (evita parpadeo).
      let recommendedTools: ToolRef[] = [];
      try {
        const raw = response.headers.get('X-Recommended-Tools');
        if (raw) recommendedTools = JSON.parse(decodeURIComponent(raw)) as ToolRef[];
      } catch (err) {
        console.warn('[chat] No se pudo parsear X-Recommended-Tools:', err);
      }

      // Quality highlight — card visual para preguntas de calidad de llamada
      let qualityMeta: QualityMeta | undefined;
      try {
        const raw = response.headers.get('X-Quality-Highlight');
        if (raw) qualityMeta = JSON.parse(decodeURIComponent(raw)) as QualityMeta;
      } catch (err) {
        console.warn('[chat] No se pudo parsear X-Quality-Highlight:', err);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      // Coalescer chunks con requestAnimationFrame para evitar render storm.
      // Antes: cada chunk (~15/seg) hacía setConversations → re-render pesado del árbol.
      // Ahora: acumulamos en fullText y solo hacemos setState cuando el navegador
      // está listo para pintar (~60 fps, pero React colapsa updates si llegan más rápido).
      // Resultado: streaming fluido tipo ChatGPT en lugar de tartamudeante.
      let rafScheduled = false;
      let pendingText = '';

      const flushUpdate = () => {
        rafScheduled = false;
        const textSnapshot = pendingText;
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsgId ? { ...m, content: textSnapshot } : m
                  ),
                }
              : c
          )
        );
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        pendingText = fullText;
        if (!rafScheduled) {
          rafScheduled = true;
          requestAnimationFrame(flushUpdate);
        }
      }

      // Flush final garantizado: el último chunk SIEMPRE se renderiza,
      // aunque el rAF anterior aún no haya disparado.
      pendingText = fullText;
      flushUpdate();

      // Extraer Quick Replies del texto y limpiarlo
      const { cleanText, replies: quickReplies } = extractQuickReplies(fullText);

      // FILTRO CRÍTICO: solo se renderizan cards de herramientas que el LLM
      // mencionó REALMENTE en el texto (por URL o por [Nombre]). Esto elimina
      // falsos positivos del trigger matching del backend — si el bot no
      // nombra la herramienta, no aparece como card.
      const mentionedTools = filterToolsMentionedInText(recommendedTools, cleanText);

      // Adjuntar tools + quality + quick replies al mensaje del asistente.
      // Se hace acá (post-stream) para que aparezcan junto con el texto final,
      // no parpadeando durante la generación.
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: cleanText, // texto sin el bloque <quick_replies>
                        ...(mentionedTools.length > 0 ? { tools: mentionedTools } : {}),
                        ...(qualityMeta ? { quality: qualityMeta } : {}),
                        ...(quickReplies.length > 0 ? { quickReplies } : {}),
                      }
                    : m
                ),
              }
            : c
        )
      );

      // Guardar respuesta del asistente (cleanText, sin el bloque de quick replies)
      // + slugs de herramientas MENCIONADAS (para re-render al recargar)
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: convId,
          role: 'assistant',
          content: cleanText,
          tool_refs: mentionedTools.map((t) => t.slug),
        }),
      });
    } catch (err) {
      // Si el usuario presionó "detener", NO mostramos error rojo — solo añadimos
      // una nota discreta al final del texto parcial que ya se generó.
      const isAbort = err instanceof DOMException && err.name === 'AbortError';

      if (isAbort) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: (m.content || '') + '\n\n_(generación detenida por el asesor)_' }
                      : m
                  ),
                }
              : c
          )
        );
      } else {
        const friendlyMessage = `🤖 ¡Ay, perdona ${capDisplayName}! Parece que hay un problema de conexión. Verifica tu internet e intenta de nuevo.\n\n[ERROR_TYPE:network]`;
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
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }

  // Loader breve post-login
  if (postLoginLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#eef4fa] dark:bg-[#0a1628] px-4">
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
        <p className="text-lg sm:text-xl font-bold text-[#1B3A5C] dark:text-white mb-1">
          ¡Hola, {capDisplayName}! 👋
        </p>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-5">
          Preparando tu asistente...
        </p>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F7941D]" style={{ animation: 'dotBounce 1.2s ease-in-out 0s infinite' }} />
          <span className="w-2.5 h-2.5 rounded-full bg-[#F7941D]" style={{ animation: 'dotBounce 1.2s ease-in-out 0.2s infinite' }} />
          <span className="w-2.5 h-2.5 rounded-full bg-[#F7941D]" style={{ animation: 'dotBounce 1.2s ease-in-out 0.4s infinite' }} />
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
          userEmail={user.email}
          displayName={user.displayName ?? undefined}
          departamento={user.departamento ?? undefined}
          rol={user.rol ?? undefined}
          photoUrl={user.photoUrl ?? null}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      <button
        onClick={() => setDesktopSidebarHidden(!desktopSidebarHidden)}
        className={`hidden md:flex fixed z-40 top-1/2 -translate-y-1/2 w-9 h-9 items-center justify-center transition-all duration-300 cursor-pointer group ${
          desktopSidebarHidden ? 'left-3' : 'left-[244px]'
        }`}
        title={desktopSidebarHidden ? 'Mostrar conversaciones' : 'Ocultar conversaciones'}
        aria-label={desktopSidebarHidden ? 'Mostrar conversaciones' : 'Ocultar conversaciones'}
      >
        <div
          className="absolute inset-0 rounded-full group-hover:opacity-100 transition-opacity"
          style={{
            background: 'radial-gradient(circle, rgba(247,148,29,0.55) 0%, rgba(247,148,29,0.15) 50%, transparent 75%)',
            filter: 'blur(6px)',
            animation: 'haloPulse 2.4s ease-in-out infinite',
          }}
        />
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
        onLogout={() => onSignOut()}
        onOpenProfile={() => setProfileOpen(true)}
        displayName={user.displayName ?? undefined}
      />

      {profileOpen && (
        <ProfileModal
          user={{
            email: user.email,
            displayName: user.displayName,
            departamento: user.departamento,
            rol: user.rol,
          }}
          onClose={() => setProfileOpen(false)}
          onSaved={() => {
            // Refresca página para que NextAuth vuelva a leer user_roles
            window.location.reload();
          }}
        />
      )}

      <MascotPanel state={mascotState} sidebarHidden={desktopSidebarHidden} />

      {/* Warning de inactividad: aparece 1 minuto antes del logout automático */}
      {showInactivityWarning && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-400 dark:border-amber-600 rounded-lg shadow-lg px-5 py-3 max-w-md mx-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⏱️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                ¿Sigues ahí, {capDisplayName}?
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                Por seguridad, vamos a cerrar tu sesión en 1 minuto si no hay actividad. Mueve el mouse o toca el teclado para continuar.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-1 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none">
        <p className="text-[9px] text-gray-400/35 dark:text-gray-500/35 tracking-wider">
          © Juan Sebastian Rivera · {new Date().getFullYear()}
        </p>
      </div>

      <main className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${desktopSidebarHidden ? 'md:pl-16' : 'md:pl-28'}`}>
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
              userEmail={user.email}
              userDisplayName={user.displayName ?? undefined}
              userPhotoUrl={user.photoUrl ?? null}
              onRegenerate={regenerateLastResponse}
              conversationId={activeId}
              onQuickReply={(text) => sendMessage(text)}
            />
            {/* Easter eggs — juegos inline encima del input */}
            {invadersOpen && <WindmarInvaders onClose={() => setInvadersOpen(false)} />}
            {snakeOpen && <WindmarSnake onClose={() => setSnakeOpen(false)} />}
            {pongOpen && <WindmarPong onClose={() => setPongOpen(false)} />}
            {/* Estado loading de Zoho (skeleton naranja) */}
            {zohoLoading && (
              <div className="mx-auto my-3 max-w-[860px] w-full rounded-xl border-2 border-orange-500/40 px-5 py-6 text-center" style={{ background: '#0a1628', color: '#F7941D' }}>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Buscando en Zoho CRM…
                </div>
              </div>
            )}
            {/* Error de Zoho */}
            {zohoError && !zohoLoading && (
              <div className="mx-auto my-3 max-w-[860px] w-full rounded-xl border-2 border-red-500/40 px-5 py-3 text-sm flex items-center justify-between gap-3" style={{ background: '#0a1628', color: '#fecaca' }}>
                <span>⚠️ {zohoError}</span>
                <button onClick={() => setZohoError(null)} className="text-gray-400 hover:text-white cursor-pointer flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}
            {/* Card de cliente con coach IA */}
            {zohoClient && (
              <div className="relative">
                <button
                  onClick={() => setZohoClient(null)}
                  className="absolute top-2 right-2 z-10 text-gray-400 hover:text-white p-1.5 rounded-md hover:bg-white/10 cursor-pointer"
                  aria-label="Cerrar"
                  title="Cerrar tarjeta de cliente"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                <ClientCard client={zohoClient} />
              </div>
            )}
            {followUpOpen && (
              <FollowUpEmailModal
                asesorName={user.formalName || capDisplayName}
                asesorEmail={user.email}
                asesorCargo={asesorCargo}
                onClose={() => setFollowUpOpen(false)}
                onSent={(to, name, templateLabel) =>
                  insertStaticReply(
                    `✅ **Correo enviado** — *${templateLabel}*\n\n📧 A: **${name}** (${to})\n📂 Quedó guardado en tu carpeta **Enviados** de Outlook.\n\n¿En qué más te ayudo?`
                  )
                }
              />
            )}
            <ChatInput
              onSend={sendMessage}
              disabled={isStreaming}
              isStreaming={isStreaming}
              onStop={stopStreaming}
              onAttach={uploadDocument}
              onTypingChange={(typing) => {
                if (!isStreaming) setMascotState(typing ? 'typing' : 'idle');
              }}
            />
          </>
        ) : (
          <>
            {invadersOpen && <WindmarInvaders onClose={() => setInvadersOpen(false)} />}
            {snakeOpen && <WindmarSnake onClose={() => setSnakeOpen(false)} />}
            {pongOpen && <WindmarPong onClose={() => setPongOpen(false)} />}
            {/* Estado loading de Zoho (skeleton naranja) */}
            {zohoLoading && (
              <div className="mx-auto my-3 max-w-[860px] w-full rounded-xl border-2 border-orange-500/40 px-5 py-6 text-center" style={{ background: '#0a1628', color: '#F7941D' }}>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Buscando en Zoho CRM…
                </div>
              </div>
            )}
            {/* Error de Zoho */}
            {zohoError && !zohoLoading && (
              <div className="mx-auto my-3 max-w-[860px] w-full rounded-xl border-2 border-red-500/40 px-5 py-3 text-sm flex items-center justify-between gap-3" style={{ background: '#0a1628', color: '#fecaca' }}>
                <span>⚠️ {zohoError}</span>
                <button onClick={() => setZohoError(null)} className="text-gray-400 hover:text-white cursor-pointer flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}
            {/* Card de cliente con coach IA */}
            {zohoClient && (
              <div className="relative">
                <button
                  onClick={() => setZohoClient(null)}
                  className="absolute top-2 right-2 z-10 text-gray-400 hover:text-white p-1.5 rounded-md hover:bg-white/10 cursor-pointer"
                  aria-label="Cerrar"
                  title="Cerrar tarjeta de cliente"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                <ClientCard client={zohoClient} />
              </div>
            )}
            {followUpOpen && (
              <FollowUpEmailModal
                asesorName={user.formalName || capDisplayName}
                asesorEmail={user.email}
                asesorCargo={asesorCargo}
                onClose={() => setFollowUpOpen(false)}
                onSent={(to, name, templateLabel) =>
                  insertStaticReply(
                    `✅ **Correo enviado** — *${templateLabel}*\n\n📧 A: **${name}** (${to})\n📂 Quedó guardado en tu carpeta **Enviados** de Outlook.\n\n¿En qué más te ayudo?`
                  )
                }
              />
            )}
            <WelcomeScreen
              onSend={sendMessage}
              disabled={isStreaming}
              onAttach={uploadDocument}
              onTypingChange={(typing) => {
                if (!isStreaming) setMascotState(typing ? 'typing' : 'idle');
              }}
            />
          </>
        )}
      </main>
    </div>
  );
}
