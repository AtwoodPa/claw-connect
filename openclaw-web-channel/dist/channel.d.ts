import type { PluginConfig } from './config.js';
import type { ChannelPlugin, GetServerFn, Logger } from './types.js';
export declare function createWebChannel(config: PluginConfig, logger: Logger, getServer: GetServerFn): ChannelPlugin;
