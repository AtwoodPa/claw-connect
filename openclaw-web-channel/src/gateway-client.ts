import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';
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

type PendingRequest = {
  resolve: (frame: GatewayResFrame) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

export class GatewayWsClient {
  private ws: WebSocket | null = null;
  private readonly wsUrl: string;
  private readonly token?: string;
  private readonly connectTimeoutMs: number;
  private readonly requestTimeoutMs: number;
  private readonly reconnectDelayMs: number;
  private readonly logger?: Logger;
  private pending = new Map<string, PendingRequest>();
  private connectPromise: Promise<void> | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private closedByUser = false;
  private eventHandlers = new Set<(frame: GatewayEventFrame) => void>();

  constructor(opts: GatewayClientOptions) {
    this.wsUrl = opts.wsUrl;
    this.token = opts.token?.trim() || undefined;
    this.connectTimeoutMs = opts.connectTimeoutMs ?? 8000;
    this.requestTimeoutMs = opts.requestTimeoutMs ?? 20000;
    this.reconnectDelayMs = opts.reconnectDelayMs ?? 2500;
    this.logger = opts.logger;
  }

  onEvent(handler: (frame: GatewayEventFrame) => void): () => void {
    this.eventHandlers.add(handler);
    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  async start(): Promise<void> {
    this.closedByUser = false;
    await this.connect();
  }

  private async connect(): Promise<void> {
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

  private scheduleReconnect() {
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

  private async handshake(ws: WebSocket): Promise<void> {
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

  private sendRequestFrame(ws: WebSocket, method: string, params?: unknown): Promise<GatewayResFrame> {
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const frame: GatewayReqFrame = {
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

  private handleMessage(raw: WebSocket.RawData): void {
    const text = typeof raw === 'string' ? raw : Buffer.from(raw as Buffer).toString('utf8');

    let frame: GatewayResFrame | GatewayEventFrame | null = null;
    try {
      frame = JSON.parse(text) as GatewayResFrame | GatewayEventFrame;
    } catch {
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
        } catch (error) {
          this.logger?.error('Gateway event handler crashed', {
            error: error instanceof Error ? error.message : String(error),
            event: frame.event,
          });
        }
      }
    }
  }

  private flushPending(error: Error): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timeout);
      pending.reject(error);
      this.pending.delete(id);
    }
  }

  async request<T = unknown>(method: string, params?: unknown): Promise<T> {
    await this.connect();
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error('Gateway not connected');
    }

    const response = await this.sendRequestFrame(ws, method, params);
    if (response.ok) {
      return (response.payload ?? null) as T;
    }

    const message = response.error?.message ?? 'Gateway request failed';
    const code = response.error?.code;
    throw new Error(code ? `[${code}] ${message}` : message);
  }

  close(): void {
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

export function resolveGatewayWsUrl(params: {
  host?: string;
  port?: number;
  customUrl?: string;
}): string {
  if (params.customUrl?.trim()) {
    const raw = params.customUrl.trim();
    return raw.startsWith('ws://') || raw.startsWith('wss://') ? raw : `ws://${raw}`;
  }
  const host = params.host ?? '127.0.0.1';
  const port = params.port ?? 18789;
  return `ws://${host}:${port}`;
}
