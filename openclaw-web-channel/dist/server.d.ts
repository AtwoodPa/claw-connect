import WebSocket from 'ws';
import type { PluginConfig } from './config.js';
import type { GatewayWsClient } from './gateway-client.js';
import type { Logger } from './types.js';
export interface WebChannelPluginApi {
    logger: Logger;
}
export declare class WebChannelServer {
    private readonly config;
    private readonly api;
    private readonly gatewayClient;
    private readonly app;
    private readonly server;
    private readonly wss;
    private readonly clients;
    private readonly sessionSubscribers;
    private readonly runBuffers;
    private readonly finalRecoveryCache;
    private gatewayEventUnsubscribe;
    constructor(config: PluginConfig, api: WebChannelPluginApi, gatewayClient: GatewayWsClient | null);
    private setupRoutes;
    private setupWebSocket;
    private setupGatewayBridge;
    private handleGatewayEvent;
    private forwardChatEvent;
    private getSubscribedAuthenticatedClients;
    private resolveAssistantTextFromHistory;
    private forwardAgentEvent;
    private handleMessage;
    private ensureAuthenticated;
    private subscribeClientToSession;
    private removeClient;
    private sendJson;
    start(): Promise<void>;
    stop(): Promise<void>;
    isRunning(): boolean;
    getStatus(): {
        running: boolean;
        connections: number;
        port: number;
    };
    getConnection(sessionId: string): WebSocket | undefined;
    getConnectionCount(): number;
}
