import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';
export class GatewayWsClient {
    ws = null;
    wsUrl;
    token;
    connectTimeoutMs;
    requestTimeoutMs;
    reconnectDelayMs;
    logger;
    pending = new Map();
    connectPromise = null;
    reconnectTimer = null;
    closedByUser = false;
    eventHandlers = new Set();
    constructor(opts) {
        this.wsUrl = opts.wsUrl;
        this.token = opts.token?.trim() || undefined;
        this.connectTimeoutMs = opts.connectTimeoutMs ?? 8000;
        this.requestTimeoutMs = opts.requestTimeoutMs ?? 20000;
        this.reconnectDelayMs = opts.reconnectDelayMs ?? 2500;
        this.logger = opts.logger;
    }
    onEvent(handler) {
        this.eventHandlers.add(handler);
        return () => {
            this.eventHandlers.delete(handler);
        };
    }
    async start() {
        this.closedByUser = false;
        await this.connect();
    }
    async connect() {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }
        if (this.connectPromise) {
            return this.connectPromise;
        }
        this.connectPromise = new Promise((resolve, reject) => {
            const ws = new WebSocket(this.wsUrl, {
                handshakeTimeout: this.connectTimeoutMs,
            });
            this.ws = ws;
            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error('Gateway WebSocket connect timeout'));
            }, this.connectTimeoutMs);
            ws.on('open', () => {
                clearTimeout(timeout);
                this.handshake(ws)
                    .then(() => {
                    this.logger?.info('Gateway websocket connected', { wsUrl: this.wsUrl });
                    this.connectPromise = null;
                    resolve();
                })
                    .catch((error) => {
                    this.connectPromise = null;
                    ws.close();
                    reject(error instanceof Error ? error : new Error(String(error)));
                });
            });
            ws.on('message', (data) => {
                this.handleMessage(data);
            });
            ws.on('close', () => {
                clearTimeout(timeout);
                this.ws = null;
                this.connectPromise = null;
                this.flushPending(new Error('Gateway WebSocket closed'));
                if (!this.closedByUser) {
                    this.scheduleReconnect();
                }
            });
            ws.on('error', (error) => {
                clearTimeout(timeout);
                this.connectPromise = null;
                reject(error instanceof Error ? error : new Error(String(error)));
            });
        });
        return this.connectPromise;
    }
    scheduleReconnect() {
        if (this.reconnectTimer) {
            return;
        }
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect().catch((error) => {
                this.logger?.error('Gateway reconnect failed', {
                    error: error instanceof Error ? error.message : String(error),
                });
                this.scheduleReconnect();
            });
        }, this.reconnectDelayMs);
    }
    async handshake(ws) {
        const res = await this.sendRequestFrame(ws, 'connect', {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
                id: 'gateway-client',
                displayName: 'openclaw-web-channel',
                version: '1.1.0',
                platform: 'node',
                mode: 'backend',
            },
            role: 'operator',
            scopes: ['operator.read', 'operator.write'],
            caps: ['tool-events'],
            auth: this.token ? { token: this.token } : undefined,
        });
        if (!res.ok) {
            const message = res.error?.message ?? 'Gateway connect failed';
            throw new Error(`Gateway connect failed: ${message}`);
        }
    }
    sendRequestFrame(ws, method, params) {
        return new Promise((resolve, reject) => {
            const id = randomUUID();
            const frame = {
                type: 'req',
                id,
                method,
                params,
            };
            const timeout = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`Gateway request timeout: ${method}`));
            }, this.requestTimeoutMs);
            this.pending.set(id, {
                resolve: (response) => {
                    clearTimeout(timeout);
                    resolve(response);
                },
                reject: (error) => {
                    clearTimeout(timeout);
                    reject(error);
                },
                timeout,
            });
            ws.send(JSON.stringify(frame));
        });
    }
    handleMessage(raw) {
        const text = typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf8');
        let frame = null;
        try {
            frame = JSON.parse(text);
        }
        catch {
            return;
        }
        if (!frame || typeof frame !== 'object') {
            return;
        }
        if (frame.type === 'res') {
            const pending = this.pending.get(frame.id);
            if (!pending) {
                return;
            }
            this.pending.delete(frame.id);
            clearTimeout(pending.timeout);
            pending.resolve(frame);
            return;
        }
        if (frame.type === 'event') {
            for (const handler of this.eventHandlers) {
                try {
                    handler(frame);
                }
                catch (error) {
                    this.logger?.error('Gateway event handler crashed', {
                        error: error instanceof Error ? error.message : String(error),
                        event: frame.event,
                    });
                }
            }
        }
    }
    flushPending(error) {
        for (const [id, pending] of this.pending) {
            clearTimeout(pending.timeout);
            pending.reject(error);
            this.pending.delete(id);
        }
    }
    async request(method, params) {
        await this.connect();
        const ws = this.ws;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            throw new Error('Gateway not connected');
        }
        const response = await this.sendRequestFrame(ws, method, params);
        if (response.ok) {
            return (response.payload ?? null);
        }
        const message = response.error?.message ?? 'Gateway request failed';
        const code = response.error?.code;
        throw new Error(code ? `[${code}] ${message}` : message);
    }
    close() {
        this.closedByUser = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.flushPending(new Error('Gateway client closed'));
        this.ws?.close();
        this.ws = null;
        this.connectPromise = null;
    }
}
export function resolveGatewayWsUrl(params) {
    if (params.customUrl?.trim()) {
        const raw = params.customUrl.trim();
        return raw.startsWith('ws://') || raw.startsWith('wss://') ? raw : `ws://${raw}`;
    }
    const host = params.host ?? '127.0.0.1';
    const port = params.port ?? 18789;
    return `ws://${host}:${port}`;
}
//# sourceMappingURL=gateway-client.js.map