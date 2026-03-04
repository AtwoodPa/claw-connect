export function generateId(): string {
  return (
    crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toSessionKey(sessionId: string): string {
  return `agent:main:web-channel:direct:${sessionId}`;
}

export function sessionIdFromSessionKey(sessionKey?: string): string | null {
  if (!sessionKey) {
    return null;
  }
  const marker = 'agent:main:web-channel:direct:';
  if (!sessionKey.startsWith(marker)) {
    return null;
  }
  const id = sessionKey.slice(marker.length).trim();
  return id.length > 0 ? id : null;
}
