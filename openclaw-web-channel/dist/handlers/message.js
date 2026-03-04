import { verifyToken } from '../utils/auth.js';
import { generateId, resolveSessionKey } from '../utils/formatter.js';
export function handleAuth(client, payload, config) {
    try {
        if (config.auth.type === 'apikey') {
            const apiKey = typeof payload.apiKey === 'string' ? payload.apiKey.trim() : '';
            if (!apiKey || !config.auth.apiKey || apiKey !== config.auth.apiKey) {
                return { type: 'auth_failed', error: 'Invalid apiKey' };
            }
            client.isAuthenticated = true;
            client.userId = 'apikey-user';
            return { type: 'auth_success' };
        }
        const token = typeof payload.token === 'string' ? payload.token.trim() : '';
        if (!token) {
            return { type: 'auth_failed', error: 'Token required' };
        }
        const decoded = verifyToken(config.auth.secret, token);
        client.isAuthenticated = true;
        if (typeof decoded.sub === 'string') {
            client.userId = decoded.sub;
        }
        return { type: 'auth_success' };
    }
    catch {
        return { type: 'auth_failed', error: 'Token invalid or expired' };
    }
}
export function buildChatSendParams(client, payload) {
    const content = typeof payload.content === 'string' ? payload.content : '';
    const message = content.trim();
    if (!message) {
        throw new Error('content is required');
    }
    const sessionKey = resolveSessionKey({
        sessionKey: typeof payload.sessionKey === 'string' ? payload.sessionKey : null,
        sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : null,
        fallbackSessionId: client.sessionId,
    });
    const messageId = typeof payload.messageId === 'string' ? payload.messageId.trim() : '';
    const idempotencyKey = messageId || generateId();
    return {
        sessionKey,
        message,
        idempotencyKey,
        thinking: typeof payload.thinking === 'string' ? payload.thinking : undefined,
        attachments: Array.isArray(payload.attachments) ? payload.attachments : undefined,
    };
}
export function buildHistoryParams(client, payload) {
    const sessionKey = resolveSessionKey({
        sessionKey: typeof payload.sessionKey === 'string' ? payload.sessionKey : null,
        sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : null,
        fallbackSessionId: client.sessionId,
    });
    const limit = typeof payload.limit === 'number' && Number.isFinite(payload.limit)
        ? Math.max(1, Math.min(500, Math.floor(payload.limit)))
        : undefined;
    return { sessionKey, limit };
}
export function buildAbortParams(client, payload) {
    const sessionKey = resolveSessionKey({
        sessionKey: typeof payload.sessionKey === 'string' ? payload.sessionKey : null,
        sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : null,
        fallbackSessionId: client.sessionId,
    });
    return {
        sessionKey,
        runId: typeof payload.runId === 'string' && payload.runId.trim() ? payload.runId : undefined,
    };
}
//# sourceMappingURL=message.js.map