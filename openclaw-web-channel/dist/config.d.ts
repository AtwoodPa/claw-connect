import { z } from 'zod';
export declare const pluginConfigSchema: z.ZodObject<{
    port: z.ZodDefault<z.ZodNumber>;
    host: z.ZodDefault<z.ZodString>;
    gateway: z.ZodOptional<z.ZodObject<{
        wsUrl: z.ZodOptional<z.ZodString>;
        token: z.ZodOptional<z.ZodString>;
        connectTimeoutMs: z.ZodDefault<z.ZodNumber>;
        requestTimeoutMs: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        connectTimeoutMs: number;
        requestTimeoutMs: number;
        wsUrl?: string | undefined;
        token?: string | undefined;
    }, {
        wsUrl?: string | undefined;
        token?: string | undefined;
        connectTimeoutMs?: number | undefined;
        requestTimeoutMs?: number | undefined;
    }>>;
    cors: z.ZodDefault<z.ZodObject<{
        origins: z.ZodDefault<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
        credentials: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        origins: string | string[];
        credentials: boolean;
    }, {
        origins?: string | string[] | undefined;
        credentials?: boolean | undefined;
    }>>;
    auth: z.ZodObject<{
        type: z.ZodDefault<z.ZodEnum<["jwt", "apikey"]>>;
        secret: z.ZodString;
        expiration: z.ZodDefault<z.ZodNumber>;
        apiKey: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "jwt" | "apikey";
        secret: string;
        expiration: number;
        apiKey?: string | undefined;
    }, {
        secret: string;
        type?: "jwt" | "apikey" | undefined;
        expiration?: number | undefined;
        apiKey?: string | undefined;
    }>;
    accounts: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        webhookUrl: z.ZodOptional<z.ZodString>;
        apiKey: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        apiKey?: string | undefined;
        webhookUrl?: string | undefined;
    }, {
        apiKey?: string | undefined;
        enabled?: boolean | undefined;
        webhookUrl?: string | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    port: number;
    host: string;
    cors: {
        origins: string | string[];
        credentials: boolean;
    };
    auth: {
        type: "jwt" | "apikey";
        secret: string;
        expiration: number;
        apiKey?: string | undefined;
    };
    gateway?: {
        connectTimeoutMs: number;
        requestTimeoutMs: number;
        wsUrl?: string | undefined;
        token?: string | undefined;
    } | undefined;
    accounts?: Record<string, {
        enabled: boolean;
        apiKey?: string | undefined;
        webhookUrl?: string | undefined;
    }> | undefined;
}, {
    auth: {
        secret: string;
        type?: "jwt" | "apikey" | undefined;
        expiration?: number | undefined;
        apiKey?: string | undefined;
    };
    port?: number | undefined;
    host?: string | undefined;
    gateway?: {
        wsUrl?: string | undefined;
        token?: string | undefined;
        connectTimeoutMs?: number | undefined;
        requestTimeoutMs?: number | undefined;
    } | undefined;
    cors?: {
        origins?: string | string[] | undefined;
        credentials?: boolean | undefined;
    } | undefined;
    accounts?: Record<string, {
        apiKey?: string | undefined;
        enabled?: boolean | undefined;
        webhookUrl?: string | undefined;
    }> | undefined;
}>;
export type PluginConfig = z.infer<typeof pluginConfigSchema>;
