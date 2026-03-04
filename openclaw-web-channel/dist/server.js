import { createServer } from 'node:http';
import express from 'express';
import cors from 'cors';
import WebSocket, { WebSocketServer } from 'ws';
import { createClient } from './handlers/connection.js';
import { buildAbortParams, buildChatSendParams, buildHistoryParams, handleAuth, } from './handlers/message.js';
import { signToken } from './utils/auth.js';
import { extractAssistantTextFromGatewayMessage, resolveSessionKey } from './utils/formatter.js';
export class WebChannelServer {
    config;
    api;
    gatewayClient;
    app = express();
    server = createServer(this.app);
    wss;
    clients = new Map();
    sessionSubscribers = new Map();
    runBuffers = new Map();
    finalRecoveryCache = new Map();
    gatewayEventUnsubscribe = null;
    constructor(config, api, gatewayClient) {
        this.config = config;
        this.api = api;
        this.gatewayClient = gatewayClient;
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(cors({
            origin: this.config.cors.origins,
            credentials: this.config.cors.credentials,
        }));
        this.setupRoutes();
        this.wss = new WebSocketServer({
            server: this.server,
            path: '/ws',
        });
        this.setupWebSocket();
        this.setupGatewayBridge();
    }
    setupRoutes() {
        this.app.get('/health', (_req, res) => {
            res.json({
                status: 'ok',
                running: this.isRunning(),
                connections: this.clients.size,
                timestamp: Date.now(),
            });
        });
        this.app.get('/config', (_req, res) => {
            res.json({
                features: {
                    streaming: true,
                    sessionHistory: true,
                    stopGeneration: true,
                    sessionsList: true,
                    markdown: true,
                    images: true,
                },
                limits: {
                    maxMessageLength: 20000,
                    maxHistoryLimit: 500,
                },
            });
        });
        this.app.post('/auth', (req, res) => {
            try {
                const body = (req.body ?? {});
                const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
                if (this.config.auth.apiKey && apiKey !== this.config.auth.apiKey) {
                    res.status(401).json({ error: 'Invalid apiKey' });
                    return;
                }
                const token = signToken(this.config.auth.secret, {
                    sub: typeof body.sub === 'string' && body.sub.trim() ? body.sub.trim() : 'web-user',
                    expiresIn: this.config.auth.expiration,
                });
                res.json({ token, type: 'Bearer', expiresIn: this.config.auth.expiration });
            }
            catch (error) {
                this.api.logger.error('Failed to mint auth token', {
                    error: error instanceof Error ? error.message : String(error),
                });
                res.status(500).json({ error: 'Failed to issue token' });
            }
        });
        this.app.get('/sessions', async (req, res) => {
            if (!this.gatewayClient) {
                res.status(503).json({ error: 'Gateway unavailable' });
                return;
            }
            try {
                const limitRaw = Number(req.query.limit);
                const limit = Number.isFinite(limitRaw)
                    ? Math.max(1, Math.min(200, Math.floor(limitRaw)))
                    : 50;
                const result = await this.gatewayClient.request('sessions.list', {
                    limit,
                    includeDerivedTitles: true,
                    includeLastMessage: true,
                });
                res.json({
                    sessions: Array.isArray(result?.sessions) ? result.sessions : [],
                    ts: Date.now(),
                });
            }
            catch (error) {
                this.api.logger.error('Failed to load sessions', {
                    error: error instanceof Error ? error.message : String(error),
                });
                res.status(500).json({ error: 'Failed to load sessions' });
            }
        });
    }
    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            const client = createClient(ws);
            this.clients.set(client.id, client);
            const defaultSessionKey = resolveSessionKey({
                sessionId: client.sessionId,
                fallbackSessionId: client.sessionId,
            });
            this.subscribeClientToSession(client, defaultSessionKey);
            this.sendJson(ws, {
                type: 'connected',
                clientId: client.id,
                sessionId: client.sessionId,
                sessionKey: defaultSessionKey,
                timestamp: Date.now(),
            });
            ws.on('message', async (raw) => {
                try {
                    const text = typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf8');
                    const message = JSON.parse(text);
                    await this.handleMessage(client, message.type ?? '', message.payload ?? {});
                }
                catch {
                    this.sendJson(ws, {
                        type: 'error',
                        error: 'Invalid message format',
                        ts: Date.now(),
                    });
                }
            });
            ws.on('close', () => {
                this.removeClient(client);
            });
            ws.on('error', (error) => {
                this.api.logger.error('Web socket error', {
                    clientId: client.id,
                    error: error.message,
                });
            });
        });
    }
    setupGatewayBridge() {
        if (!this.gatewayClient) {
            return;
        }
        this.gatewayEventUnsubscribe = this.gatewayClient.onEvent((frame) => {
            void this.handleGatewayEvent(frame);
        });
    }
    async handleGatewayEvent(frame) {
        if (frame.event === 'chat') {
            await this.forwardChatEvent(frame);
            return;
        }
        if (frame.event === 'agent') {
            this.forwardAgentEvent(frame);
        }
    }
    async forwardChatEvent(frame) {
        const payload = (frame.payload ?? {});
        const sessionKey = typeof payload.sessionKey === 'string' ? payload.sessionKey : '';
        if (!sessionKey) {
            return;
        }
        const subscribers = this.getSubscribedAuthenticatedClients(sessionKey);
        if (subscribers.length === 0) {
            return;
        }
        const runId = typeof payload.runId === 'string' ? payload.runId : undefined;
        const state = typeof payload.state === 'string' ? payload.state : 'delta';
        let fullText = extractAssistantTextFromGatewayMessage(payload.message);
        if (state === 'final' && runId && !fullText) {
            if (this.finalRecoveryCache.has(runId)) {
                fullText = this.finalRecoveryCache.get(runId) ?? '';
            }
            else {
                const recovered = await this.resolveAssistantTextFromHistory(sessionKey);
                if (recovered) {
                    fullText = recovered;
                    this.finalRecoveryCache.set(runId, recovered);
                    this.api.logger.info('Recovered final chat text from history', {
                        runId,
                        sessionKey,
                        length: recovered.length,
                    });
                }
            }
        }
        let deltaText = '';
        if (runId && fullText) {
            const previous = this.runBuffers.get(runId) ?? '';
            if (fullText.startsWith(previous)) {
                deltaText = fullText.slice(previous.length);
            }
            else {
                deltaText = fullText;
            }
            this.runBuffers.set(runId, fullText);
        }
        for (const client of subscribers) {
            if ((state === 'delta' || state === 'final') && runId && deltaText) {
                this.sendJson(client.ws, {
                    type: 'message',
                    id: runId,
                    role: 'assistant',
                    content: deltaText,
                    timestamp: Date.now(),
                    sessionKey,
                    threadId: payload.threadId,
                });
            }
            if (state === 'final' || state === 'aborted') {
                this.sendJson(client.ws, {
                    type: 'message',
                    id: runId ?? 'unknown',
                    role: 'assistant',
                    content: '',
                    done: true,
                    timestamp: Date.now(),
                    sessionKey,
                    threadId: payload.threadId,
                });
            }
            if (state === 'error') {
                this.sendJson(client.ws, {
                    type: 'message_error',
                    runId,
                    sessionKey,
                    error: payload.errorMessage ?? 'Unknown chat error',
                    timestamp: Date.now(),
                });
            }
            if (state === 'final' && runId && !deltaText && !fullText) {
                this.sendJson(client.ws, {
                    type: 'message_error',
                    runId,
                    sessionKey,
                    error: 'Agent returned empty visible output. Please check model output and prompts.',
                    timestamp: Date.now(),
                });
            }
        }
        if ((state === 'final' || state === 'aborted' || state === 'error') && runId) {
            this.runBuffers.delete(runId);
            this.finalRecoveryCache.delete(runId);
        }
    }
    getSubscribedAuthenticatedClients(sessionKey) {
        const subscriberIds = this.sessionSubscribers.get(sessionKey);
        if (!subscriberIds || subscriberIds.size === 0) {
            return [];
        }
        const result = [];
        for (const clientId of subscriberIds) {
            const client = this.clients.get(clientId);
            if (!client || !client.isAuthenticated) {
                continue;
            }
            result.push(client);
        }
        return result;
    }
    async resolveAssistantTextFromHistory(sessionKey) {
        if (!this.gatewayClient) {
            return '';
        }
        const attempts = 6;
        for (let attempt = 1; attempt <= attempts; attempt += 1) {
            try {
                const history = await this.gatewayClient.request('chat.history', {
                    sessionKey,
                    limit: 20,
                });
                const messages = Array.isArray(history?.messages) ? history.messages : [];
                for (let i = messages.length - 1; i >= 0; i -= 1) {
                    const entry = messages[i];
                    const role = typeof entry?.role === 'string'
                        ? entry.role
                        : typeof entry?.message?.role === 'string'
                            ? ((entry?.message).role ?? '')
                            : '';
                    if (role !== 'assistant') {
                        continue;
                    }
                    const candidate = entry?.message ?? entry;
                    const text = extractAssistantTextFromGatewayMessage(candidate);
                    if (text) {
                        return text;
                    }
                }
            }
            catch (error) {
                this.api.logger.warn?.('Failed to recover final text from history', {
                    sessionKey,
                    attempt,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
            if (attempt < attempts) {
                await new Promise((resolve) => {
                    setTimeout(resolve, 250);
                });
            }
        }
        return '';
    }
    forwardAgentEvent(frame) {
        const payload = frame.payload;
        if (!payload || typeof payload.sessionKey !== 'string') {
            return;
        }
        const subscriberIds = this.sessionSubscribers.get(payload.sessionKey);
        if (!subscriberIds || subscriberIds.size === 0) {
            return;
        }
        for (const clientId of subscriberIds) {
            const client = this.clients.get(clientId);
            if (!client || !client.isAuthenticated) {
                continue;
            }
            this.sendJson(client.ws, {
                type: 'agent_event',
                event: frame.event,
                payload: frame.payload,
                ts: Date.now(),
            });
        }
    }
    async handleMessage(client, type, payload) {
        switch (type) {
            case 'auth': {
                const result = handleAuth(client, payload, this.config);
                this.sendJson(client.ws, result);
                return;
            }
            case 'chat': {
                if (!this.ensureAuthenticated(client)) {
                    return;
                }
                if (!this.gatewayClient) {
                    this.sendJson(client.ws, {
                        type: 'message_error',
                        error: 'Gateway client not configured',
                        timestamp: Date.now(),
                    });
                    return;
                }
                try {
                    const params = buildChatSendParams(client, payload);
                    this.subscribeClientToSession(client, params.sessionKey);
                    const ack = await this.gatewayClient.request('chat.send', {
                        sessionKey: params.sessionKey,
                        message: params.message,
                        thinking: params.thinking,
                        deliver: false,
                        attachments: params.attachments,
                        idempotencyKey: params.idempotencyKey,
                    });
                    this.sendJson(client.ws, {
                        type: 'chat_ack',
                        runId: ack?.runId ?? params.idempotencyKey,
                        status: ack?.status ?? 'started',
                        sessionKey: params.sessionKey,
                        ts: Date.now(),
                    });
                }
                catch (error) {
                    this.sendJson(client.ws, {
                        type: 'message_error',
                        error: error instanceof Error ? error.message : String(error),
                        timestamp: Date.now(),
                    });
                }
                return;
            }
            case 'history': {
                if (!this.ensureAuthenticated(client)) {
                    return;
                }
                if (!this.gatewayClient) {
                    this.sendJson(client.ws, { type: 'error', error: 'Gateway unavailable', ts: Date.now() });
                    return;
                }
                try {
                    const params = buildHistoryParams(client, payload);
                    this.subscribeClientToSession(client, params.sessionKey);
                    const result = await this.gatewayClient.request('chat.history', {
                        sessionKey: params.sessionKey,
                        limit: params.limit,
                    });
                    this.sendJson(client.ws, {
                        type: 'history',
                        sessionKey: result?.sessionKey ?? params.sessionKey,
                        messages: Array.isArray(result?.messages) ? result.messages : [],
                        thinkingLevel: result?.thinkingLevel,
                        verboseLevel: result?.verboseLevel,
                    });
                }
                catch (error) {
                    this.sendJson(client.ws, {
                        type: 'error',
                        error: error instanceof Error ? error.message : String(error),
                        ts: Date.now(),
                    });
                }
                return;
            }
            case 'sessions': {
                if (!this.ensureAuthenticated(client)) {
                    return;
                }
                if (!this.gatewayClient) {
                    this.sendJson(client.ws, { type: 'error', error: 'Gateway unavailable', ts: Date.now() });
                    return;
                }
                try {
                    const limitRaw = typeof payload.limit === 'number' ? payload.limit : 50;
                    const limit = Math.max(1, Math.min(200, Math.floor(limitRaw)));
                    const result = await this.gatewayClient.request('sessions.list', {
                        limit,
                        includeDerivedTitles: true,
                        includeLastMessage: true,
                    });
                    this.sendJson(client.ws, {
                        type: 'session_list',
                        sessions: Array.isArray(result?.sessions) ? result.sessions : [],
                        ts: Date.now(),
                    });
                }
                catch (error) {
                    this.sendJson(client.ws, {
                        type: 'error',
                        error: error instanceof Error ? error.message : String(error),
                        ts: Date.now(),
                    });
                }
                return;
            }
            case 'stop': {
                if (!this.ensureAuthenticated(client)) {
                    return;
                }
                if (!this.gatewayClient) {
                    this.sendJson(client.ws, { type: 'error', error: 'Gateway unavailable', ts: Date.now() });
                    return;
                }
                try {
                    const params = buildAbortParams(client, payload);
                    this.subscribeClientToSession(client, params.sessionKey);
                    await this.gatewayClient.request('chat.abort', params);
                    this.sendJson(client.ws, {
                        type: 'stopped',
                        sessionKey: params.sessionKey,
                        runId: params.runId,
                        ts: Date.now(),
                    });
                }
                catch (error) {
                    this.sendJson(client.ws, {
                        type: 'error',
                        error: error instanceof Error ? error.message : String(error),
                        ts: Date.now(),
                    });
                }
                return;
            }
            case 'ping': {
                this.sendJson(client.ws, { type: 'pong', timestamp: Date.now() });
                return;
            }
            default:
                this.sendJson(client.ws, {
                    type: 'error',
                    error: `Unsupported message type: ${type}`,
                    ts: Date.now(),
                });
        }
    }
    ensureAuthenticated(client) {
        if (client.isAuthenticated) {
            return true;
        }
        this.sendJson(client.ws, {
            type: 'error',
            error: 'Not authenticated',
            ts: Date.now(),
        });
        return false;
    }
    subscribeClientToSession(client, sessionKey) {
        client.knownSessionKeys.add(sessionKey);
        const subscribers = this.sessionSubscribers.get(sessionKey);
        if (subscribers) {
            subscribers.add(client.id);
            return;
        }
        this.sessionSubscribers.set(sessionKey, new Set([client.id]));
    }
    removeClient(client) {
        this.clients.delete(client.id);
        for (const sessionKey of client.knownSessionKeys) {
            const subscribers = this.sessionSubscribers.get(sessionKey);
            if (!subscribers) {
                continue;
            }
            subscribers.delete(client.id);
            if (subscribers.size === 0) {
                this.sessionSubscribers.delete(sessionKey);
            }
        }
    }
    sendJson(ws, payload) {
        if (ws.readyState !== WebSocket.OPEN) {
            return;
        }
        ws.send(JSON.stringify(payload));
    }
    async start() {
        await new Promise((resolve, reject) => {
            this.server.listen(this.config.port, this.config.host, () => resolve());
            this.server.once('error', reject);
        });
        this.api.logger.info('Web channel server started', {
            host: this.config.host,
            port: this.config.port,
        });
    }
    async stop() {
        for (const client of this.clients.values()) {
            client.ws.close();
        }
        this.clients.clear();
        this.sessionSubscribers.clear();
        this.runBuffers.clear();
        if (this.gatewayEventUnsubscribe) {
            this.gatewayEventUnsubscribe();
            this.gatewayEventUnsubscribe = null;
        }
        await new Promise((resolve) => {
            this.server.close(() => resolve());
        });
    }
    isRunning() {
        return this.server.listening;
    }
    getStatus() {
        return {
            running: this.isRunning(),
            connections: this.clients.size,
            port: this.config.port,
        };
    }
    getConnection(sessionId) {
        for (const client of this.clients.values()) {
            if (client.sessionId === sessionId) {
                return client.ws;
            }
        }
        return undefined;
    }
    getConnectionCount() {
        return this.clients.size;
    }
}
//# sourceMappingURL=server.js.map