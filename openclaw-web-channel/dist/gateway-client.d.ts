import type { Logger } from './types.js';
export type GatewayReqFrame = {
    type: 'req';
    id: string;
    method: string;
    params?: unknown;
};
export type GatewayResFrame = {
    type: 'res';
    id: string;
    ok: boolean;
    payload?: unknown;
    error?: {
        code?: string;
        message?: string;
        details?: unknown;
    };
};
export type GatewayEventFrame = {
    type: 'event';
    event: string;
    payload?: unknown;
    seq?: number;
    stateVersion?: Record<string, unknown>;
};
export interface GatewayClientOptions {
    wsUrl: string;
    token?: string;
    connectTimeoutMs?: number;
    requestTimeoutMs?: number;
    reconnectDelayMs?: number;
    logger?: Logger;
}
export declare class GatewayWsClient {
    private ws;
    private readonly wsUrl;
    private readonly token?;
    private readonly connectTimeoutMs;
    private readonly requestTimeoutMs;
    private readonly reconnectDelayMs;
    private readonly logger?;
    private pending;
    private connectPromise;
    private reconnectTimer;
    private closedByUser;
    private eventHandlers;
    constructor(opts: GatewayClientOptions);
    onEvent(handler: (frame: GatewayEventFrame) => void): () => void;
    start(): Promise<void>;
    private connect;
    private scheduleReconnect;
    private handshake;
    private sendRequestFrame;
    private handleMessage;
    private flushPending;
    request<T = unknown>(method: string, params?: unknown): Promise<T>;
    close(): void;
}
export declare function resolveGatewayWsUrl(params: {
    host?: string;
    port?: number;
    customUrl?: string;
}): string;
