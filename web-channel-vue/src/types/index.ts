export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  sessionKey?: string;
  images?: Array<string | { url?: string }>;
  error?: string;
}

export interface Session {
  id: string;
  sessionKey: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  isPinned?: boolean;
}

export interface SetupConfig {
  gatewayUrl: string;
  apiKey: string;
  token: string;
}
