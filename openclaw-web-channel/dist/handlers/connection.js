import { generateId } from '../utils/formatter.js';
export function createClient(ws) {
    return {
        id: generateId(),
        ws,
        sessionId: generateId(),
        accountId: 'default',
        isAuthenticated: false,
        knownSessionKeys: new Set(),
    };
}
//# sourceMappingURL=connection.js.map