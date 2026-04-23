export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeDoc {
  id: number;
  categoria: string;
  subcategoria: string;
  producto_id: string;
  titulo: string;
  contenido: string;
  metadata: Record<string, unknown>;
  area: string;
  activo: boolean;
}

export interface ChatRequest {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}
