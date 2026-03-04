import { WebSocket } from 'ws';
import { generateId } from './utils/formatter.js';
function normalizeRecipient(to) {
    if (!to) {
        return null;
    }
    const stripped = to.replace(/^(user|channel|group|direct|dm):/i, '').trim();
    return stripped || null;
}
export function createWebChannel(config, logger, getServer) {
    return {
        id: 'web-channel',
        meta: {
            id: 'web-channel',
            label: 'Web Channel',
            selectionLabel: 'Web (Browser)',
            docsPath: '/channels/web-channel',
            blurb: 'WebSocket + HTTP bridge for browser chat clients',
            aliases: ['web', 'browser'],
        },
        capabilities: {
            chatTypes: ['direct', 'group'],
            supportsAttachments: true,
            supportsStreaming: true,
            supportsReactions: false,
            supportsThreading: true,
        },
        config: {
            listAccountIds: (cfg) => {
                const accounts = cfg.channels?.['web-channel']?.accounts;
                return Object.keys(accounts ?? {});
            },
            resolveAccount: (cfg, accountId) => {
                const channelCfg = cfg.channels?.['web-channel'];
                const accounts = channelCfg?.accounts ?? {};
                const id = accountId ?? 'default';
                const account = accounts[id];
                if (!account) {
                    throw new Error(`Account ${id} not found`);
                }
                return {
                    accountId: id,
                    ...account,
                    host: config.host,
                    port: config.port,
                };
            },
        },
        outbound: {
            deliveryMode: 'direct',
            sendText: async ({ text, to, threadId }) => {
                const server = getServer();
                if (!server) {
                    return { ok: false, error: 'Server not running', retryable: true };
                }
                const target = normalizeRecipient(to);
                if (!target) {
                    return { ok: false, error: 'Missing recipient target', retryable: false };
                }
                const connection = server.getConnection(target);
                if (!connection || connection.readyState !== WebSocket.OPEN) {
                    return { ok: false, error: 'Client disconnected', retryable: true };
                }
                connection.send(JSON.stringify({
                    type: 'message',
                    id: generateId(),
                    role: 'assistant',
                    content: text,
                    done: true,
                    timestamp: Date.now(),
                    threadId: threadId ? String(threadId) : undefined,
                }));
                return { ok: true };
            },
            sendFile: async ({ file, to }) => {
                const server = getServer();
                if (!server) {
                    return { ok: false, error: 'Server not running' };
                }
                const target = normalizeRecipient(to);
                if (!target) {
                    return { ok: false, error: 'Missing recipient target' };
                }
                const connection = server.getConnection(target);
                if (!connection || connection.readyState !== WebSocket.OPEN) {
                    return { ok: false, error: 'Client disconnected' };
                }
                connection.send(JSON.stringify({
                    type: 'file',
                    id: generateId(),
                    fileName: file.name,
                    fileUrl: file.url,
                    mimeType: file.mimeType,
                    timestamp: Date.now(),
                }));
                return { ok: true };
            },
        },
        status: {
            async probe() {
                const server = getServer();
                const running = server?.isRunning() ?? false;
                return {
                    ok: running,
                    status: running ? 'connected' : 'disconnected',
                    details: {
                        host: config.host,
                        port: config.port,
                        connections: server?.getConnectionCount() ?? 0,
                    },
                };
            },
        },
    };
}
//# sourceMappingURL=channel.js.map