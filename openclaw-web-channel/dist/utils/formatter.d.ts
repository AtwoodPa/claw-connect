export declare function generateId(): string;
export declare function normalizeSessionId(input?: string | null): string | null;
export declare function resolveSessionKey(params: {
    sessionKey?: string | null;
    sessionId?: string | null;
    fallbackSessionId: string;
}): string;
export declare function extractAssistantTextFromGatewayMessage(message: unknown): string;
