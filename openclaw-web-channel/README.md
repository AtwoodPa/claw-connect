# OpenClaw Web Channel

将浏览器聊天界面通过 WebSocket/HTTP 接入 OpenClaw Gateway 的桥接插件。

## 关键能力

- 浏览器 WebSocket 会话管理（`/ws`）
- JWT / API Key 鉴权（`/auth`）
- 代理 Gateway RPC：`chat.send` / `chat.history` / `chat.abort` / `sessions.list`
- 转发 Gateway 事件：`event:chat`（流式回复）、`event:agent`（工具/生命周期事件）
- OpenClaw channel outbound 回推（可将 Gateway 对外发送结果回传到在线网页）

## 架构

```
Browser UI (web-channel-vue)
      │  ws/http
      ▼
openclaw-web-channel (this plugin)
      │  Gateway RPC + events
      ▼
OpenClaw Gateway
```

## 配置示例

`~/.openclaw/openclaw.json`：

```json
{
  "plugins": {
    "entries": {
      "web-channel": {
        "enabled": true,
        "path": "/absolute/path/to/openclaw-web-channel"
      }
    }
  },
  "channels": {
    "web-channel": {
      "host": "0.0.0.0",
      "port": 3000,
      "gateway": {
        "wsUrl": "ws://127.0.0.1:18789",
        "token": "<gateway-auth-token>"
      },
      "cors": {
        "origins": ["http://localhost:5173"],
        "credentials": true
      },
      "auth": {
        "type": "jwt",
        "secret": "replace-with-strong-secret",
        "expiration": 7200,
        "apiKey": "optional-client-api-key"
      }
    }
  }
}
```

## API

### HTTP

| Method | Path | 说明 |
|---|---|---|
| GET | `/health` | 服务健康状态 |
| POST | `/auth` | 获取 JWT（可带 `{ "apiKey": "..." }`） |
| GET | `/config` | 前端可用能力与限制 |
| GET | `/sessions` | 代理 `sessions.list` |

### WebSocket (`/ws`)

客户端发送：

- `auth`：`{ type: "auth", payload: { token } }`
- `chat`：`{ type: "chat", payload: { content, sessionId?, sessionKey?, messageId? } }`
- `history`：`{ type: "history", payload: { sessionId?, sessionKey?, limit? } }`
- `stop`：`{ type: "stop", payload: { runId?, sessionId?, sessionKey? } }`
- `sessions`：`{ type: "sessions", payload: { limit? } }`
- `ping`

服务端返回（核心）：

- `connected`
- `auth_success` / `auth_failed`
- `chat_ack`
- `message`（流式增量 + `done` 结束标记）
- `history`
- `session_list`
- `message_error`
- `error`
- `pong`

## 开发

```bash
cd openclaw-web-channel
npm install
npm run build
npm run smoke:e2e
```

## 网关缺口分析

已整理 OpenClaw Gateway 的“可接入但尚未实现”方法/事件清单：

- [docs/openclaw-gateway-gap.md](./docs/openclaw-gateway-gap.md)

## 相关

- 前端配套：[../web-channel-vue](../web-channel-vue/)
