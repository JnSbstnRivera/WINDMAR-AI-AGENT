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

export interface UserRole {
  user_email: string;
  display_name: string | null;
  departamento: string | null;
  rol: 'Asesor' | 'Líder' | 'Channel' | 'Project M';
}
