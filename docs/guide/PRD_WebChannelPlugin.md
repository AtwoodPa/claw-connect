# PRD: OpenClaw Web Channel Plugin for Cursor

## 1. 项目概述

### 1.1 目标
开发一个 OpenClaw Channel Plugin，使前后端分离的 Web 项目能够通过 HTTP/WebSocket 与 OpenClaw Gateway 通信，实现浏览器用户与 AI Agent 的实时对话。

### 1.2 技术栈
- **Runtime**: Node.js ≥18
- **Language**: TypeScript 5.3+
- **Package Manager**: npm/pnpm
- **Transport**: WebSocket (ws library) + HTTP Express
- **OpenClaw Version**: ≥2026.2.x

### 1.3 架构位置
```
┌─────────────────┐      WebSocket/HTTP       ┌──────────────────┐
│  Browser (React)│◄──────────────────────────►│  Your Plugin     │
│  Frontend       │                           │  (This Project)  │
└─────────────────┘                           └────────┬─────────┘
                                                       │ Plugin API
                                              ┌────────▼─────────┐
                                              │  OpenClaw        │
                                              │  Gateway         │
                                              │  (Port 18789)    │
                                              └──────────────────┘
```

## 2. 目录结构 (Cursor 生成用)

```
openclaw-web-channel/
├── openclaw.plugin.json          # Plugin 清单 (必须)
├── package.json                  # NPM 配置
├── tsconfig.json                 # TypeScript 配置
├── README.md                     # 使用文档
├── src/
│   ├── index.ts                  # 入口: register(api)
│   ├── channel.ts                # ChannelPlugin 实现
│   ├── server.ts                 # WebSocket/HTTP 服务器
│   ├── config.ts                 # 配置类型与验证
│   ├── types.ts                  # 全局类型定义
│   ├── handlers/
│   │   ├── message.ts            # 消息处理器
│   │   ├── connection.ts         # 连接管理
│   │   └── file.ts               # 文件上传处理
│   └── utils/
│       ├── logger.ts             # 日志工具
│       ├── auth.ts               # JWT 验证
│       └── formatter.ts          # 消息格式转换
├── dist/                         # 编译输出 (npm 发布用)
└── tests/
    ├── channel.test.ts
    └── server.test.ts
```

## 3. 核心文件详细需求

### 3.1 openclaw.plugin.json (Plugin 清单)
```json
{
  "id": "web-channel",
  "name": "OpenClaw Web Channel",
  "version": "1.0.0",
  "description": "WebSocket/HTTP channel for browser-based AI chat",
  "author": "Your Name",
  "license": "MIT",
  "configSchema": {
    "type": "object",
    "properties": {
      "port": { "type": "number", "default": 3000 },
      "host": { "type": "string", "default": "127.0.0.1" },
      "cors": {
        "type": "object",
        "properties": {
          "origins": { "type": "array", "items": { "type": "string" } },
          "credentials": { "type": "boolean", "default": true }
        }
      },
      "auth": {
        "type": "object",
        "properties": {
          "type": { "type": "string", "enum": ["jwt", "apikey"], "default": "jwt" },
          "secret": { "type": "string" },
          "expiration": { "type": "number", "default": 3600 }
        },
        "required": ["secret"]
      },
      "accounts": {
        "type": "object",
        "additionalProperties": {
          "type": "object",
          "properties": {
            "enabled": { "type": "boolean", "default": true },
            "webhookUrl": { "type": "string" },
            "apiKey": { "type": "string" }
          }
        }
      }
    },
    "required": ["port", "auth"]
  }
}
```

### 3.2 package.json (NPM 配置)
```json
{
  "name": "@yourorg/openclaw-web-channel",
  "version": "1.0.0",
  "description": "Web channel plugin for OpenClaw Gateway",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": [
    "dist",
    "openclaw.plugin.json",
    "README.md"
  ],
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "clean": "rm -rf dist",
    "test": "vitest",
    "prepublishOnly": "npm run build"
  },
  "openclaw": {
    "extensions": ["./dist/index.js"]
  },
  "peerDependencies": {
    "openclaw": ">=2026.2.0"
  },
  "dependencies": {
    "ws": "^8.16.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.22.4",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/ws": "^8.5.10",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/uuid": "^9.0.7",
    "typescript": "^5.3.3",
    "vitest": "^1.0.0"
  }
}
```

### 3.3 src/index.ts (入口文件)
**需求描述**: 
- 导出默认函数 `register(api: OpenClawPluginApi)`
- 注册 Channel Plugin
- 注册 HTTP 路由处理前端请求
- 注册后台服务启动 WebSocket 服务器
- 处理插件生命周期（启动/停止）

**代码模板**:
```typescript
import type { OpenClawPluginApi } from 'openclaw/plugin-sdk';
import { createWebChannel } from './channel.js';
import { WebChannelServer } from './server.js';
import { pluginConfigSchema, type PluginConfig } from './config.js';

let server: WebChannelServer | null = null;

export default function register(api: OpenClawPluginApi) {
  const logger = api.logger.child('web-channel');

  // 1. 获取并验证配置
  const rawConfig = api.pluginConfig as PluginConfig;
  const config = pluginConfigSchema.parse(rawConfig);

  logger.info(`Initializing Web Channel on ${config.host}:${config.port}`);

  // 2. 注册 Channel
  api.registerChannel({
    plugin: createWebChannel(config, logger)
  });

  // 3. 注册后台服务（启动 WebSocket/HTTP 服务器）
  api.registerService({
    id: 'web-channel-server',
    start: async (ctx) => {
      server = new WebChannelServer(config, api, ctx);
      await server.start();
      logger.info(`Web Channel server started on port ${config.port}`);
    },
    stop: async () => {
      if (server) {
        await server.stop();
        server = null;
        logger.info('Web Channel server stopped');
      }
    }
  });

  // 4. 注册 HTTP 路由（用于 REST API）
  api.registerHttpRoute({
    method: 'POST',
    path: '/web-channel/send',
    handler: async (req, res) => {
      // 处理前端发来的消息
      const { message, sessionId } = req.body;
      // 转发给 Gateway...
      res.json({ success: true, id: generateId() });
    }
  });

  // 5. 注册 CLI 命令（可选）
  api.registerCli(({ program }) => {
    program
      .command('web-channel:status')
      .description('Show Web Channel connection status')
      .action(() => {
        console.log(server?.getStatus() ?? 'Server not running');
      });
  });
}
```

### 3.4 src/channel.ts (Channel 实现)
**需求描述**:
- 实现 `ChannelPlugin` 接口
- 处理出站消息（Agent -> Browser）
- 处理账户配置解析
- 定义渠道能力

**核心接口实现**:
```typescript
import type { 
  ChannelPlugin, 
  ChannelConfigAdapter, 
  ChannelOutboundAdapter,
  ChannelStatusAdapter,
  Logger 
} from 'openclaw/plugin-sdk';
import type { PluginConfig } from './config.js';

export function createWebChannel(
  config: PluginConfig, 
  logger: Logger
): ChannelPlugin {
  return {
    id: 'web-channel',

    meta: {
      id: 'web-channel',
      label: 'Web Channel',
      selectionLabel: 'Web (Browser)',
      docsPath: '/channels/web-channel',
      blurb: 'WebSocket/HTTP channel for browser-based chat interfaces',
      aliases: ['web', 'browser'],
    },

    capabilities: {
      chatTypes: ['direct', 'group'],
      supportsAttachments: true,
      supportsStreaming: true,
      supportsReactions: false,
      supportsThreading: true,
    },

    config: {
      listAccountIds: (cfg) => {
        return Object.keys(cfg.channels?.['web-channel']?.accounts ?? {});
      },

      resolveAccount: (cfg, accountId) => {
        const accounts = cfg.channels?.['web-channel']?.accounts ?? {};
        const account = accounts[accountId ?? 'default'];
        if (!account) {
          throw new Error(`Account ${accountId} not found`);
        }
        return {
          accountId: accountId ?? 'default',
          ...account,
          // 合并全局配置
          port: config.port,
          host: config.host,
        };
      }
    },

    outbound: {
      deliveryMode: 'direct',

      sendText: async ({ text, channel, account, context }) => {
        // 通过 WebSocket 发送给浏览器
        const sessionId = channel; // channel 对应前端 session
        const connection = getConnection(sessionId);

        if (!connection) {
          return { 
            ok: false, 
            error: 'Client disconnected',
            retryable: true 
          };
        }

        connection.send(JSON.stringify({
          type: 'message',
          id: generateId(),
          role: 'assistant',
          content: text,
          timestamp: Date.now(),
          threadId: context?.threadId,
        }));

        return { ok: true };
      },

      sendFile: async ({ file, channel }) => {
        // 处理文件发送（生成下载链接）
        const sessionId = channel;
        const connection = getConnection(sessionId);

        if (!connection) {
          return { ok: false, error: 'Client disconnected' };
        }

        connection.send(JSON.stringify({
          type: 'file',
          id: generateId(),
          fileName: file.name,
          fileUrl: file.url,
          mimeType: file.mimeType,
        }));

        return { ok: true };
      }
    },

    status: {
      async probe(account) {
        // 健康检查
        const isRunning = server?.isRunning() ?? false;
        return {
          ok: isRunning,
          status: isRunning ? 'connected' : 'disconnected',
          details: {
            port: config.port,
            connections: getConnectionCount(),
          }
        };
      }
    },

    // 可选：配置向导
    setup: {
      async run(ctx) {
        // 交互式配置（CLI）
        const port = await ctx.prompter.input('Enter port number:', {
          defaultValue: '3000'
        });
        const secret = await ctx.prompter.password('Enter JWT secret:');

        return {
          configPatch: {
            channels: {
              'web-channel': {
                port: parseInt(port),
                auth: { secret, type: 'jwt' }
              }
            }
          }
        };
      }
    }
  };
}
```

### 3.5 src/server.ts (WebSocket/HTTP 服务器)
**需求描述**:
- 创建 Express HTTP 服务器
- 集成 WebSocket (ws library)
- 处理 CORS（支持前端跨域）
- JWT 认证中间件
- 消息转发到 OpenClaw Gateway
- 连接生命周期管理

**核心实现**:
```typescript
import { createServer } from 'http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import type { OpenClawPluginApi, PluginContext } from 'openclaw/plugin-sdk';
import type { PluginConfig } from './config.js';

interface WebClient {
  id: string;
  ws: WebSocket;
  userId?: string;
  sessionId: string;
  accountId: string;
  isAuthenticated: boolean;
}

export class WebChannelServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private wss: WebSocketServer;
  private clients: Map<string, WebClient> = new Map();
  private config: PluginConfig;
  private api: OpenClawPluginApi;
  private ctx: PluginContext;

  constructor(config: PluginConfig, api: OpenClawPluginApi, ctx: PluginContext) {
    this.config = config;
    this.api = api;
    this.ctx = ctx;

    // Express 设置
    this.app = express();
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(cors({
      origin: config.cors?.origins ?? '*',
      credentials: config.cors?.credentials ?? true
    }));

    // HTTP 路由
    this.setupRoutes();

    // HTTP 服务器
    this.server = createServer(this.app);

    // WebSocket 服务器
    this.wss = new WebSocketServer({ 
      server: this.server,
      path: '/ws'
    });

    this.setupWebSocket();
  }

  private setupRoutes() {
    // 健康检查
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        connections: this.clients.size,
        timestamp: Date.now()
      });
    });

    // 认证端点（获取 JWT）
    this.app.post('/auth', async (req, res) => {
      try {
        const { apiKey } = req.body;
        // 验证 apiKey...
        const token = jwt.sign(
          { sub: 'user_id', session: generateId() },
          this.config.auth.secret,
          { expiresIn: this.config.auth.expiration }
        );
        res.json({ token, type: 'Bearer' });
      } catch (error) {
        res.status(401).json({ error: 'Unauthorized' });
      }
    });

    // 获取配置（前端初始化用）
    this.app.get('/config', (req, res) => {
      res.json({
        features: {
          streaming: true,
          fileUpload: true,
          markdown: true,
        },
        limits: {
          maxFileSize: 50 * 1024 * 1024, // 50MB
          maxMessageLength: 4000,
        }
      });
    });
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const clientId = generateId();
      const client: WebClient = {
        id: clientId,
        ws,
        sessionId: generateId(),
        accountId: 'default',
        isAuthenticated: false
      };

      this.clients.set(clientId, client);
      this.api.logger.info(`New WebSocket connection: ${clientId}`);

      // 发送欢迎消息
      ws.send(JSON.stringify({
        type: 'connected',
        clientId,
        sessionId: client.sessionId,
        timestamp: Date.now()
      }));

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(client, message);
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Invalid message format'
          }));
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        this.api.logger.info(`Connection closed: ${clientId}`);
      });

      ws.on('error', (error) => {
        this.api.logger.error(`WebSocket error: ${error.message}`);
      });
    });
  }

  private async handleMessage(client: WebClient, message: any) {
    const { type, payload } = message;

    switch (type) {
      case 'auth':
        // 处理认证
        try {
          const decoded = jwt.verify(payload.token, this.config.auth.secret);
          client.isAuthenticated = true;
          client.userId = decoded.sub as string;
          client.ws.send(JSON.stringify({ type: 'auth_success' }));
        } catch {
          client.ws.send(JSON.stringify({ type: 'auth_failed' }));
        }
        break;

      case 'chat':
        if (!client.isAuthenticated) {
          client.ws.send(JSON.stringify({ type: 'error', error: 'Not authenticated' }));
          return;
        }

        // 转发到 OpenClaw Gateway
        // 使用 Gateway API 发送消息给 Agent
        try {
          // 调用 Gateway 方法触发 Agent
          const result = await this.callGatewayMethod('agent.run', {
            message: payload.content,
            channel: 'web-channel',
            sessionId: client.sessionId,
            threadId: payload.threadId,
            context: {
              userId: client.userId,
              sessionId: client.sessionId,
            }
          });

          // Agent 的回复会通过 outbound.sendText 发送回来
        } catch (error) {
          client.ws.send(JSON.stringify({
            type: 'error',
            error: 'Failed to process message'
          }));
        }
        break;

      case 'ping':
        client.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
    }
  }

  private async callGatewayMethod(method: string, params: any): Promise<any> {
    // 通过 PluginContext 调用 Gateway RPC
    return this.ctx.call(method, params);
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, this.config.host, () => {
        this.api.logger.info(`Server listening on ${this.config.host}:${this.config.port}`);
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    // 关闭所有 WebSocket 连接
    this.wss.clients.forEach(ws => ws.close());

    return new Promise((resolve) => {
      this.server.close(() => {
        resolve();
      });
    });
  }

  isRunning(): boolean {
    return this.server.listening;
  }

  getStatus() {
    return {
      running: this.isRunning(),
      connections: this.clients.size,
      port: this.config.port,
    };
  }

  // 供 channel.ts 调用的方法
  getConnection(sessionId: string): WebSocket | undefined {
    for (const client of this.clients.values()) {
      if (client.sessionId === sessionId) {
        return client.ws;
      }
    }
    return undefined;
  }

  getConnectionCount(): number {
    return this.clients.size;
  }
}
```

### 3.6 src/config.ts (配置验证)
```typescript
import { z } from 'zod';

export const pluginConfigSchema = z.object({
  port: z.number().default(3000),
  host: z.string().default('127.0.0.1'),
  cors: z.object({
    origins: z.array(z.string()).optional(),
    credentials: z.boolean().default(true)
  }).optional(),
  auth: z.object({
    type: z.enum(['jwt', 'apikey']).default('jwt'),
    secret: z.string(),
    expiration: z.number().default(3600)
  }),
  accounts: z.record(z.object({
    enabled: z.boolean().default(true),
    webhookUrl: z.string().optional(),
    apiKey: z.string().optional()
  })).optional()
});

export type PluginConfig = z.infer<typeof pluginConfigSchema>;
```

## 4. OpenClaw Gateway 配置示例

用户需要在 `~/.openclaw/openclaw.json` 中添加：

```json
{
  "plugins": {
    "entries": {
      "web-channel": {
        "enabled": true,
        "path": "/path/to/openclaw-web-channel"
      }
    }
  },
  "channels": {
    "web-channel": {
      "port": 3000,
      "host": "0.0.0.0",
      "cors": {
        "origins": ["http://localhost:5173", "https://yourdomain.com"],
        "credentials": true
      },
      "auth": {
        "type": "jwt",
        "secret": "your-secret-key-here",
        "expiration": 7200
      },
      "accounts": {
        "default": {
          "enabled": true
        }
      }
    }
  }
}
```

## 5. 前端集成示例 (React)

```typescript
// useOpenClaw.ts
import { useEffect, useRef, useState } from 'react';

export function useOpenClaw(config: { gatewayUrl: string; token?: string }) {
  const ws = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const wsUrl = config.gatewayUrl.replace('http', 'ws') + '/ws';
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setIsConnected(true);
      // 认证
      if (config.token) {
        ws.current?.send(JSON.stringify({
          type: 'auth',
          payload: { token: config.token }
        }));
      }
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message') {
        setMessages(prev => [...prev, data]);
      }
    };

    return () => ws.current?.close();
  }, [config.gatewayUrl, config.token]);

  const sendMessage = (content: string, threadId?: string) => {
    ws.current?.send(JSON.stringify({
      type: 'chat',
      payload: { content, threadId }
    }));
  };

  return { messages, sendMessage, isConnected };
}
```

## 6. Cursor 开发指令

### 6.1 生成代码提示词
```
基于以下 PRD 生成完整的 TypeScript 代码：

1. 项目: OpenClaw Web Channel Plugin
2. 架构: Node.js + TypeScript + Express + WebSocket (ws library)
3. 核心功能:
   - 作为 OpenClaw Gateway 的 Channel Plugin 运行
   - 提供 WebSocket 和 HTTP API 供浏览器前端连接
   - 支持 JWT 认证
   - 实现双向消息传递（前端 <-> Agent）

4. 文件结构要求:
   - src/index.ts: 入口，register(api) 函数
   - src/channel.ts: ChannelPlugin 实现
   - src/server.ts: WebSocket/HTTP 服务器类
   - src/config.ts: Zod 配置验证
   - src/types.ts: TypeScript 类型定义

5. 技术要求:
   - 使用 ESM ("type": "module")
   - 严格 TypeScript 类型
   - 完整的错误处理
   - 支持多账户配置
   - 遵循 OpenClaw Plugin SDK 接口

请生成完整可运行的代码，包含所有类型定义和错误处理。
```

### 6.2 测试指令
```
为生成的代码创建 Vitest 测试文件：

1. 测试 src/channel.ts:
   - 验证 ChannelPlugin 对象结构
   - 测试 config.listAccountIds 和 resolveAccount
   - 测试 outbound.sendText

2. 测试 src/server.ts:
   - 模拟 WebSocket 连接
   - 测试消息处理逻辑
   - 测试认证流程

3. 使用 mock 替换 OpenClaw Plugin API
```

## 7. 部署与发布

### 7.1 本地开发
```bash
# 1. 克隆 OpenClaw 仓库（参考源码结构）
git clone https://github.com/openclaw/openclaw.git

# 2. 创建插件目录
mkdir -p openclaw/extensions/openclaw-web-channel
cd openclaw/extensions/openclaw-web-channel

# 3. 初始化项目
npm init -y

# 4. 安装依赖
npm install ws express cors jsonwebtoken zod uuid
npm install -D typescript @types/node @types/ws @types/express vitest

# 5. 生成代码（使用 Cursor）
# ... 粘贴上述文件 ...

# 6. 构建
npm run build

# 7. 链接到 OpenClaw
openclaw plugin install ./

# 8. 配置并启动
openclaw config set channels.web-channel.port 3000
openclaw gateway
```

### 7.2 发布到 NPM
```bash
# 1. 编译
npm run build

# 2. 测试
npm test

# 3. 发布
npm publish --access public

# 4. 用户安装
npm install @yourorg/openclaw-web-channel
```

## 8. 关键接口参考

### OpenClaw Plugin API
```typescript
interface OpenClawPluginApi {
  id: string;
  logger: Logger;
  pluginConfig: Record<string, unknown>;

  registerChannel(registration: { plugin: ChannelPlugin }): void;
  registerService(service: { id: string; start: Function; stop: Function }): void;
  registerHttpRoute(route: { method: string; path: string; handler: Function }): void;
  registerCli(registrar: Function): void;
  on(event: string, handler: Function): void;
}
```

### Channel Plugin 接口
```typescript
interface ChannelPlugin {
  id: string;
  meta: ChannelMeta;
  capabilities: ChannelCapabilities;
  config: ChannelConfigAdapter;
  outbound: ChannelOutboundAdapter;
  status?: ChannelStatusAdapter;
  setup?: ChannelSetupAdapter;
}
```

---

**文档版本**: 1.0  
**适用 OpenClaw 版本**: ≥2026.2.x  
**最后更新**: 2026-03-03
