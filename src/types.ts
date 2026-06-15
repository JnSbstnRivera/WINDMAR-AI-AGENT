import type { ZohoPendingAction } from '@/lib/zoho-actions';

export interface ToolRef {
  slug: string;
  name: string;
  url: string;
  description: string | null;
  category: string;
  icon: string | null;
  is_official: boolean;
  /** Tópico para determinar el color del icono SVG (solar=naranja, roofing=violeta...). */
  topic?: string;
}

/** Tipo de tarjeta visual de calidad que el cliente debe renderizar. */
export type QualityHighlight = 'matrix' | 'criticals' | 'times' | null;

export interface QualityMeta {
  highlight: Exclude<QualityHighlight, null>;
  /** Área del asesor — para personalizar tiempos. */
  area?: 'Telemercadeo' | 'Ventas' | 'Vass' | null;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  /** Herramientas recomendadas para esta respuesta (solo en mensajes del asistente). */
  tools?: ToolRef[];
  /** Card de calidad a renderizar (matriz/críticos/tiempos). */
  quality?: QualityMeta;
  /** Preguntas de seguimiento sugeridas — se muestran como chips clicables. */
  quickReplies?: string[];
  /** Acción de escritura en Zoho preparada por el agente, a confirmar con 1 clic. */
  action?: ZohoPendingAction;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export type AppRole = 'Asesor' | 'Líder' | 'Channel' | 'Project M' | 'Admin';
export type AccessStatus = 'pending' | 'active' | 'rejected' | 'suspended';

export interface UserRole {
  user_email: string;
  display_name: string | null;
  departamento: string | null;
  rol: AppRole;
  status?: AccessStatus;
  is_superadmin?: boolean;
}
