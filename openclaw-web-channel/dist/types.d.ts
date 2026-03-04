import type { WebSocket } from 'ws';
export interface Logger {
    child(name: string): Logger;
    info(msg: string, meta?: Record<string, unknown>): void;
    error(msg: string, meta?: Record<string, unknown>): void;
    warn?(msg: string, meta?: Record<string, unknown>): void;
    debug(msg: string, meta?: Record<string, unknown>): void;
}
export interface PluginContext {
    config?: Record<string, unknown> & {
        gateway?: {
            host?: string;
            port?: number;
            auth?: {
                token?: string;
            };
        };
    };
}
export interface OpenClawPluginApi {
    id: string;
    logger: Logger;
    pluginConfig?: Record<string, unknown>;
    registerChannel(registration: {
        plugin: ChannelPlugin;
    }): void;
    registerService(service: {
        id: string;
        start: (ctx: PluginContext) => Promise<void>;
        stop: () => Promise<void>;
    }): void;
    registerCli?(registrar: (opts: {
        program: {
            command(name: string): {
                description(text: string): {
                    action(fn: () => void): void;
                };
            };
        };
    }) => void): void;
}
export interface ChannelMeta {
    id: string;
    label: string;
    selectionLabel: string;
    docsPath: string;
    blurb: string;
    aliases: string[];
}
export interface ChannelCapabilities {
    chatTypes: string[];
    supportsAttachments: boolean;
    supportsStreaming: boolean;
    supportsReactions: boolean;
    supportsThreading: boolean;
}
export interface ChannelConfigAdapter {
    listAccountIds(cfg: {
        channels?: Record<string, {
            accounts?: Record<string, unknown>;
        }>;
    }): string[];
    resolveAccount(cfg: Record<string, unknown>, accountId: string | null): Record<string, unknown>;
}
export interface OutboundContext {
    text: string;
    to?: string;
    threadId?: string | number | null;
}
export interface FileOutboundContext {
    file: {
        name: string;
        url: string;
        mimeType?: string;
    };
    to?: string;
}
export interface ChannelOutboundAdapter {
    deliveryMode: string;
    sendText(ctx: OutboundContext): Promise<{
        ok: boolean;
        error?: string;
        retryable?: boolean;
    }>;
    sendFile(ctx: FileOutboundContext): Promise<{
        ok: boolean;
        error?: string;
    }>;
}
export interface ChannelStatusAdapter {
    probe(account: Record<string, unknown>): Promise<{
        ok: boolean;
        status: string;
        details?: Record<string, unknown>;
    }>;
}
export interface ChannelPlugin {
    id: string;
    meta: ChannelMeta;
    capabilities: ChannelCapabilities;
    config: ChannelConfigAdapter;
    outbound: ChannelOutboundAdapter;
    status?: ChannelStatusAdapter;
}
export interface WebClient {
    id: string;
    ws: WebSocket;
    userId?: string;
    sessionId: string;
    accountId: string;
    isAuthenticated: boolean;
    knownSessionKeys: Set<string>;
}
export type ServerMessage = {
    type: 'connected';
    clientId: string;
    sessionId: string;
    timestamp: number;
} | {
    type: 'auth_success' | 'auth_failed';
    error?: string;
} | {
    type: 'message';
    id: string;
    role: 'assistant';
    content: string;
    timestamp: number;
    sessionKey: string;
    done?: boolean;
    threadId?: string;
} | {
    type: 'message_error';
    runId?: string;
    sessionKey?: string;
    error: string;
    timestamp: number;
} | {
    type: 'history';
    sessionKey: string;
    messages: unknown[];
    thinkingLevel?: string;
    verboseLevel?: string;
} | {
    type: 'session_list';
    sessions: unknown[];
    ts: number;
} | {
    type: 'pong';
    timestamp: number;
} | {
    type: 'error';
    error: string;
    code?: string;
    ts?: number;
};
export type GetServerFn = () => {
    isRunning(): boolean;
    getConnection(sessionId: string): WebSocket | undefined;
    getConnectionCount(): number;
    getStatus(): {
        running: boolean;
        connections: number;
        port: number;
    };
} | null;
