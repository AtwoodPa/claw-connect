import type { PluginConfig } from '../config.js';
import type { WebClient } from '../types.js';
export declare function handleAuth(client: WebClient, payload: Record<string, unknown>, config: PluginConfig): {
    type: 'auth_success' | 'auth_failed';
    error?: string;
};
export declare function buildChatSendParams(client: WebClient, payload: Record<string, unknown>): {
    sessionKey: string;
    message: string;
    idempotencyKey: string;
    thinking?: string;
    attachments?: unknown[];
};
export declare function buildHistoryParams(client: WebClient, payload: Record<string, unknown>): {
    sessionKey: string;
    limit?: number;
};
export declare function buildAbortParams(client: WebClient, payload: Record<string, unknown>): {
    sessionKey: string;
    runId?: string;
};
