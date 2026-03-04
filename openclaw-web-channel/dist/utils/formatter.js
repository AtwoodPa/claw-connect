import { v4 as uuidv4 } from 'uuid';
export function generateId() {
    return uuidv4();
}
export function normalizeSessionId(input) {
    if (!input) {
        return null;
    }
    const normalized = input.trim();
    return normalized.length > 0 ? normalized : null;
}
export function resolveSessionKey(params) {
    const sessionKey = normalizeSessionId(params.sessionKey);
    if (sessionKey) {
        return sessionKey;
    }
    const sessionId = normalizeSessionId(params.sessionId) ?? params.fallbackSessionId;
    return `agent:main:web-channel:direct:${sessionId}`;
}
export function extractAssistantTextFromGatewayMessage(message) {
    if (!message || typeof message !== 'object') {
        return '';
    }
    const entry = message;
    if (typeof entry.text === 'string' && entry.text.trim()) {
        return entry.text;
    }
    if (typeof entry.content === 'string') {
        return entry.content;
    }
    if (Array.isArray(entry.content)) {
        const texts = [];
        for (const block of entry.content) {
            if (!block || typeof block !== 'object') {
                continue;
            }
            const typed = block;
            if (typed.type === 'text' && typeof typed.text === 'string') {
                texts.push(typed.text);
            }
        }
        return texts.join('\n').trim();
    }
    return '';
}
//# sourceMappingURL=formatter.js.map