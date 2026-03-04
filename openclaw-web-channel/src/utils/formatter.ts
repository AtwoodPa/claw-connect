import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
  return uuidv4();
}

export function normalizeSessionId(input?: string | null): string | null {
  if (!input) {
    return null;
  }
  const normalized = input.trim();
  return normalized.length > 0 ? normalized : null;
}

export function resolveSessionKey(params: {
  sessionKey?: string | null;
  sessionId?: string | null;
  fallbackSessionId: string;
}): string {
  const sessionKey = normalizeSessionId(params.sessionKey);
  if (sessionKey) {
    return sessionKey;
  }
  const sessionId = normalizeSessionId(params.sessionId) ?? params.fallbackSessionId;
  return `agent:main:web-channel:direct:${sessionId}`;
}

export function extractAssistantTextFromGatewayMessage(message: unknown): string {
  if (!message || typeof message !== 'object') {
    return '';
  }
  const entry = message as { content?: unknown; text?: unknown };
  if (typeof entry.text === 'string' && entry.text.trim()) {
    return entry.text;
  }
  if (typeof entry.content === 'string') {
    return entry.content;
  }
  if (Array.isArray(entry.content)) {
    const texts: string[] = [];
    for (const block of entry.content) {
      if (!block || typeof block !== 'object') {
        continue;
      }
      const typed = block as { type?: unknown; text?: unknown };
      if (typed.type === 'text' && typeof typed.text === 'string') {
        texts.push(typed.text);
      }
    }
    return texts.join('\n').trim();
  }
  return '';
}
