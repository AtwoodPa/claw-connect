import { createWebChannel } from './channel.js';
import { pluginConfigSchema } from './config.js';
import { GatewayWsClient, resolveGatewayWsUrl } from './gateway-client.js';
import { WebChannelServer } from './server.js';
import type { OpenClawPluginApi } from './types.js';

let server: WebChannelServer | null = null;
let gatewayClient: GatewayWsClient | null = null;

function getServer(): WebChannelServer | null {
  return server;
}

export default function register(api: OpenClawPluginApi): void {
  const logger = typeof api.logger.child === 'function' ? api.logger.child('web-channel') : api.logger;

  const rawConfig = (api.pluginConfig ?? {}) as Record<string, unknown>;
  const parsed = pluginConfigSchema.safeParse(rawConfig);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'config'}: ${issue.message}`)
      .join('; ');
    throw new Error(`web-channel config invalid: ${issues}`);
  }

  const config = parsed.data;

  api.registerChannel({
    plugin: createWebChannel(config, logger, getServer),
  });

  api.registerService({
    id: 'web-channel-server',
    start: async (ctx) => {
      const openclawCfg = (ctx.config ?? {}) as {
        gateway?: {
          host?: string;
          port?: number;
          auth?: { token?: string };
        };
      };

      const wsUrl = resolveGatewayWsUrl({
        customUrl: config.gateway?.wsUrl,
        host: openclawCfg.gateway?.host,
        port: openclawCfg.gateway?.port,
      });

      const token = config.gateway?.token ?? openclawCfg.gateway?.auth?.token;

      if (token) {
        gatewayClient = new GatewayWsClient({
          wsUrl,
          token,
          connectTimeoutMs: config.gateway?.connectTimeoutMs,
          requestTimeoutMs: config.gateway?.requestTimeoutMs,
          logger,
        });
        await gatewayClient.start();
      } else {
        logger.info('Gateway token not configured; chat requests will fail until token is provided');
      }

      server = new WebChannelServer(config, api, gatewayClient);
      await server.start();
    },
    stop: async () => {
      if (server) {
        await server.stop();
        server = null;
      }
      if (gatewayClient) {
        gatewayClient.close();
        gatewayClient = null;
      }
    },
  });

  if (typeof api.registerCli === 'function') {
    api.registerCli(({ program }) => {
      program
        .command('web-channel:status')
        .description('Show web channel runtime status')
        .action(() => {
          const status = server?.getStatus() ?? { running: false };
          console.log(status);
        });
    });
  }
}
