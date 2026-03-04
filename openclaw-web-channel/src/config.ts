import { z } from 'zod';

const corsOriginsSchema = z.union([z.string(), z.array(z.string())]);

export const pluginConfigSchema = z.object({
  port: z.number().int().positive().default(3000),
  host: z.string().default('127.0.0.1'),
  gateway: z
    .object({
      wsUrl: z.string().optional(),
      token: z.string().optional(),
      connectTimeoutMs: z.number().int().positive().default(8000),
      requestTimeoutMs: z.number().int().positive().default(20000),
    })
    .optional(),
  cors: z
    .object({
      origins: corsOriginsSchema.default('*'),
      credentials: z.boolean().default(true),
    })
    .default({
      origins: '*',
      credentials: true,
    }),
  auth: z.object({
    type: z.enum(['jwt', 'apikey']).default('jwt'),
    secret: z.string().min(1),
    expiration: z.number().int().positive().default(7200),
    apiKey: z.string().optional(),
  }),
  accounts: z
    .record(
      z.object({
        enabled: z.boolean().default(true),
        webhookUrl: z.string().optional(),
        apiKey: z.string().optional(),
      }),
    )
    .optional(),
});

export type PluginConfig = z.infer<typeof pluginConfigSchema>;
