# OpenClaw Web Channel

OpenClaw Channel Plugin，使浏览器通过 WebSocket/HTTP 与 OpenClaw Gateway 通信，实现 AI Agent 实时对话。

## 架构

```
┌─────────────────┐      WebSocket/HTTP       ┌──────────────────┐
│  Browser        │◄──────────────────────────►│  Web Channel     │
│  (Vue/React)    │         /ws                │  Plugin (本项目)  │
└─────────────────┘                           └────────┬─────────┘
                                                       │ Plugin API
                                              ┌────────▼─────────┐
                                              │  OpenClaw        │
                                              │  Gateway         │
                                              └──────────────────┘
```

## 技术栈

- **Runtime**: Node.js ≥18
- **Language**: TypeScript 5.3+
- **Transport**: WebSocket (ws) + HTTP (Express)
- **Auth**: JWT
- **OpenClaw**: ≥2026.2.x

## 快速开始

### 安装

```bash
cd openclaw-web-channel
npm install
```

### 构建

```bash
npm run build
```

### 配置 OpenClaw

在 `~/.openclaw/openclaw.json` 中配置：

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

### 本地开发

```bash
# 安装依赖
npm install

# 构建（如需）
npm run build

# 链接到 OpenClaw 并启动 Gateway
openclaw plugin install ./
openclaw gateway
```

## API

### HTTP 路由

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /health | 健康检查 |
| POST | /auth | 获取 JWT（body: `{ apiKey }`） |
| GET | /config | 前端能力与限制 |

### WebSocket

- **路径**: `/ws`
- **URL**: `ws://{host}:{port}/ws`

#### 消息类型

| type | 方向 | 说明 |
|------|------|------|
| connected | 服务端→客户端 | 连接成功，含 clientId、sessionId |
| auth | 客户端→服务端 | 认证，payload: `{ token }` |
| auth_success / auth_failed | 服务端→客户端 | 认证结果 |
| chat | 客户端→服务端 | 发送消息，payload: `{ content, sessionId, threadId?, messageId }` |
| message | 服务端→客户端 | AI 回复 |
| ping / pong | 双向 | 心跳 |
| stop | 客户端→服务端 | 停止生成 |
| error | 服务端→客户端 | 错误信息 |

## 项目结构

```
openclaw-web-channel/
├── openclaw.plugin.json      # 插件清单
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # 入口 register(api)
│   ├── channel.ts            # ChannelPlugin 实现
│   ├── server.ts             # WebSocket/HTTP 服务
│   ├── config.ts             # 配置校验 (Zod)
│   ├── types.ts
│   ├── handlers/
│   └── utils/
├── dist/                     # 编译输出
└── tests/
```

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run build` | 编译 TypeScript |
| `npm run build:watch` | 监听模式编译 |
| `npm run clean` | 清理 dist |
| `npm test` | 运行测试 |

## 相关

- 前端配套: [web-channel-vue](../web-channel-vue/)
- PRD: [docs/guide/PRD_WebChannelPlugin.md](../docs/guide/PRD_WebChannelPlugin.md)
