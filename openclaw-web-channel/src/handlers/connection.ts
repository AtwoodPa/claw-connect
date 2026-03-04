import type { WebSocket } from 'ws';
import type { WebClient } from '../types.js';
import { generateId } from '../utils/formatter.js';

export function createClient(ws: WebSocket): WebClient {
  return {
    id: generateId(),
    ws,
    sessionId: generateId(),
    accountId: 'default',
    isAuthenticated: false,
    knownSessionKeys: new Set<string>(),
  };
}
