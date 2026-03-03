# OpenClaw Web Channel Plugin - 详细需求规格说明书 (SRS)

**版本**: 1.0  
**日期**: 2026-03-03  
**状态**: Draft  

---

## 1. 引言

### 1.1 目的
本文档详细定义 OpenClaw Web Channel Plugin 的功能需求、接口规范、性能指标和验收标准，用于指导开发团队实现该插件。

### 1.2 范围
- **包含**: WebSocket/HTTP 服务器、身份认证、消息转发、会话管理
- **不包含**: Gateway 核心修改、前端 UI 实现、AI 模型交互逻辑

### 1.3 定义和缩写
| 术语 | 定义 |
|------|------|
| Gateway | OpenClaw 核心网关服务 |
| Plugin | 通过 OpenClaw Plugin API 扩展的功能模块 |
| Channel | OpenClaw 中的通信渠道抽象 |
| Session | 用户与 AI 的对话会话 |
| Client | 浏览器端 WebSocket 连接 |

### 1.4 参考文档
- OpenClaw Plugin SDK 文档
- OpenClaw Gateway WebSocket Protocol v3

---

## 2. 总体描述

### 2.1 产品视角
本插件作为 OpenClaw Gateway 的 Channel 插件运行，在 Gateway 和浏览器客户端之间建立桥梁，使 Web 应用能够接入 OpenClaw AI 能力。

### 2.2 用户类别
| 用户类型 | 描述 | 需求 |
|----------|------|------|
| **前端开发者** | 集成聊天功能到 Web 应用 | 稳定的 WebSocket API、完善的 SDK |
| **系统管理员** | 部署和维护插件 | 简单配置、监控能力、日志 |
| **终端用户** | 使用浏览器与 AI 对话 | 低延迟、高可用、实时响应 |

### 2.3 运行环境
- **Node.js**: ≥ 18.0.0 (LTS)
- **操作系统**: Linux (Ubuntu 20.04+), macOS (12+), Windows Server 2019+
- **内存**: 最小 512MB，推荐 1GB+
- **网络**: 可访问 Gateway (默认端口 18789)，暴露 WebSocket 端口 (可配置)

### 2.4 约束和假设
- **约束**:
  - 必须遵循 OpenClaw Plugin SDK 接口规范
  - WebSocket 协议必须兼容标准浏览器 WebSocket API
  - 生产环境强制使用 WSS (WebSocket Secure)

- **假设**:
  - Gateway 已正确安装并运行
  - 网络环境支持 WebSocket 长连接
  - 用户浏览器支持 ES2020+

---

## 3. 功能性需求

### 3.1 需求分类

#### 3.1.1 连接管理 (CONN)

**CONN-001: WebSocket 服务启动**
- **优先级**: P0 (关键)
- **描述**: 插件启动时必须在指定端口启动 WebSocket 服务器
- **输入**: 
  - port: number (默认 3000)
  - host: string (默认 127.0.0.1)
- **处理**: 
  - 创建 HTTP 服务器
  - 附加 WebSocket 服务器到 HTTP 服务器
  - 绑定到指定地址和端口
- **输出**: 
  - 成功: 服务器监听中，日志输出 "WebSocket server started on {host}:{port}"
  - 失败: 抛出错误，包含具体原因 (端口占用、权限不足等)
- **验收标准**:
  - 能够在默认端口 3000 启动
  - 端口被占用时返回明确错误
  - 启动时间 < 3 秒

**CONN-002: 客户端连接建立**
- **优先级**: P0
- **描述**: 接受浏览器 WebSocket 连接并初始化客户端会话
- **触发**: 浏览器发起 WebSocket 连接到 `/ws`
- **处理**:
  1. 生成唯一 clientId (UUID v4)
  2. 生成唯一 sessionId (UUID v4)
  3. 创建客户端对象，标记 isAuthenticated = false
  4. 发送 `connected` 事件给客户端
- **输出**: 
  - 客户端收到: `{ type: "connected", clientId, sessionId, timestamp }`
- **验收标准**:
  - 每个连接有唯一的 clientId 和 sessionId
  - 连接建立后 100ms 内发送 connected 事件
  - 内存中维护客户端映射表

**CONN-003: 心跳检测**
- **优先级**: P1 (重要)
- **描述**: 维持连接活性，检测死连接
- **机制**:
  - 服务器每 30 秒发送 ping 帧
  - 客户端应在 10 秒内返回 pong 帧
  - 连续 3 次未收到 pong，断开连接
- **验收标准**:
  - 正常连接不中断
  - 客户端断网后 90 秒内检测到并清理资源

**CONN-004: 优雅关闭**
- **优先级**: P1
- **描述**: 插件停止时优雅关闭所有连接
- **触发**: Gateway 停止、插件重新加载、SIGTERM 信号
- **处理**:
  1. 停止接受新连接
  2. 发送 `server_closing` 事件给所有客户端
  3. 等待 5 秒让客户端处理
  4. 强制关闭剩余连接
  5. 释放端口和资源
- **验收标准**:
  - 所有客户端收到关闭通知
  - 资源完全释放，无内存泄漏

#### 3.1.2 身份认证 (AUTH)

**AUTH-001: JWT Token 认证**
- **优先级**: P0
- **描述**: 验证客户端身份
- **触发**: 客户端发送 `auth` 消息
- **输入**: 
  - token: string (JWT format)
  - deviceInfo?: object
- **处理**:
  1. 验证 JWT 签名 (使用配置的 secret)
  2. 验证 JWT 是否过期
  3. 提取 userId 和 claims
  4. 更新客户端对象 (isAuthenticated = true, userId)
- **输出**:
  - 成功: `{ type: "auth_success", userId }`
  - 失败: `{ type: "auth_failed", error: "Invalid token" }` 并断开连接
- **错误码**:
  - AUTH_001: Token 格式错误
  - AUTH_002: Token 过期
  - AUTH_003: 签名验证失败
  - AUTH_004: Token 被吊销 (如支持)
- **验收标准**:
  - 有效 Token 通过认证
  - 无效 Token 拒绝并断开
  - 认证延迟 < 100ms

**AUTH-002: 匿名连接 (可选)**
- **优先级**: P2
- **描述**: 支持无认证连接 (仅用于测试)
- **配置**: `auth.allowAnonymous: boolean` (默认 false)
- **处理**: 如允许，跳过认证步骤，分配临时 userId
- **验收标准**: 配置为 true 时，不发送 auth 也能通信

#### 3.1.3 消息处理 (MSG)

**MSG-001: 接收用户消息**
- **优先级**: P0
- **描述**: 接收浏览器发送的聊天消息并转发给 Gateway
- **触发**: 客户端发送 `chat` 消息
- **输入**:
  - content: string (必填, 非空, 最大 4000 字符)
  - sessionId: string (必填)
  - messageId: string (必填, 客户端生成 UUID)
  - threadId?: string (可选)
  - attachments?: string[] (文件 URL 数组, 可选)
- **验证**:
  - 检查客户端已认证
  - 检查 sessionId 存在
  - 检查 content 不为空且长度 <= 4000
- **处理**:
  1. 构造 GatewayMessage 对象
  2. 调用 Gateway `agent.run` 方法
  3. 保存 messageId 到 pending 集合 (用于流式追踪)
- **输出**:
  - 立即返回: `{ type: "message_received", messageId }`
  - 异步通过 WebSocket 推送 AI 响应
- **错误码**:
  - MSG_001: 未认证
  - MSG_002: 消息格式错误
  - MSG_003: 消息过长
  - MSG_004: sessionId 无效
- **验收标准**:
  - 有效消息 50ms 内确认接收
  - 消息不丢失
  - 重复 messageId 去重

**MSG-002: 流式输出转发**
- **优先级**: P0
- **描述**: 将 Gateway 的流式响应实时转发给客户端
- **触发**: Gateway 返回流式响应 (stream: true)
- **输入**: StreamChunk 对象
  - content: string
  - index: number
  - isLast?: boolean
- **处理**:
  1. 根据 sessionId 查找客户端连接
  2. 发送 `chunk` 事件: `{ type: "chunk", content, index }`
  3. 最后一块发送 `stream_end`: `{ type: "stream_end" }`
- **输出**: WebSocket 消息流
- **验收标准**:
  - 首包延迟 < 500ms
  - 每包延迟 < 50ms
  - 顺序不乱 (通过 index 校验)

**MSG-003: 发送 AI 消息 (Outbound)**
- **优先级**: P0
- **描述**: 实现 ChannelPlugin.outbound.sendText 接口
- **触发**: Gateway 调用 sendText 发送 AI 回复
- **输入**:
  - text: string (Markdown 格式)
  - channel: string (对应 sessionId)
  - account: AccountConfig
  - context?: MessageContext
- **处理**:
  1. 通过 channel (sessionId) 查找客户端连接
  2. 如连接存在，发送 `message` 事件
  3. 如连接不存在，返回错误 (可重连)
- **输出**:
  - 成功: `{ ok: true }`
  - 失败: `{ ok: false, error: "Client disconnected", retryable: true }`
- **验收标准**:
  - 消息成功投递到浏览器
  - 客户端断开时返回可重试错误

**MSG-004: 消息中止**
- **优先级**: P1
- **描述**: 用户主动停止 AI 生成
- **触发**: 客户端发送 `stop` 消息
- **输入**: messageId: string
- **处理**:
  1. 查找进行中的生成任务
  2. 调用 Gateway `agent.stop` 方法
  3. 发送 `stopped` 确认给客户端
- **输出**: `{ type: "stopped", messageId }`
- **验收标准**:
  - 100ms 内停止生成
  - 已生成的内容保留

**MSG-005: 文件上传**
- **优先级**: P1
- **描述**: 支持用户上传图片/文件
- **HTTP API**: `POST /upload`
- **输入**: multipart/form-data, 文件字段名 "file"
- **约束**:
  - 单文件最大 50MB
  - 支持类型: image/*, application/pdf, text/*
- **处理**:
  1. 验证文件大小和类型
  2. 生成唯一文件名
  3. 保存到本地目录或上传到对象存储
  4. 返回可访问的 URL
- **输出**: 
  - 成功: `{ url: string, filename: string, size: number, mimeType: string }`
  - 失败: `{ error: string, code: string }`
- **错误码**:
  - FILE_001: 文件过大
  - FILE_002: 不支持的类型
  - FILE_003: 上传失败
- **验收标准**:
  - 10MB 文件 3 秒内完成
  - URL 可访问且安全

#### 3.1.4 HTTP API (API)

**API-001: 健康检查**
- **方法**: GET
- **路径**: /health
- **响应**:
  ```json
  {
    "status": "healthy",
    "timestamp": 1709452800000,
    "connections": 42,
    "uptime": 86400
  }
  ```
- **验收标准**: 响应时间 < 100ms

**API-002: 获取配置**
- **方法**: GET
- **路径**: /config
- **响应**:
  ```json
  {
    "features": {
      "streaming": true,
      "fileUpload": true,
      "maxFileSize": 52428800
    },
    "limits": {
      "maxMessageLength": 4000,
      "maxConnections": 1000
    }
  }
  ```
- **用途**: 前端初始化时获取能力配置

**API-003: 认证端点**
- **方法**: POST
- **路径**: /auth
- **请求**: `{ apiKey: string }`
- **响应**: 
  - 成功: `{ token: string, type: "Bearer", expiresIn: 7200 }`
  - 失败: `{ error: "Invalid API key" }` (401)
- **用途**: 不支持 WebSocket 首包认证的场景

---

## 4. 接口规范

### 4.1 OpenClaw Plugin 接口

#### 4.1.1 register(api)
**描述**: 插件入口函数
**参数**:
- api: OpenClawPluginApi
  - id: string (插件实例 ID)
  - logger: Logger (结构化日志)
  - pluginConfig: object (用户配置)
  - registerChannel: function
  - registerService: function
  - registerHttpRoute: function

**返回**: void

#### 4.1.2 ChannelPlugin 对象
**结构**:
```typescript
{
  id: "web-channel",              // 渠道标识

  meta: {
    id: "web-channel",
    label: "Web Channel",         // UI 显示名称
    selectionLabel: "Web (Browser)",
    docsPath: "/channels/web-channel",
    blurb: "WebSocket channel for browser integration",
    aliases: ["web", "browser"]
  },

  capabilities: {
    chatTypes: ["direct", "group"],
    supportsAttachments: true,      // 支持文件
    supportsStreaming: true,        // 支持流式
    supportsReactions: false,       // 不支持表情反应
    supportsThreading: true         // 支持线程
  },

  config: {
    listAccountIds: (cfg) => string[],      // 列出可用账户
    resolveAccount: (cfg, id) => Account    // 解析账户配置
  },

  outbound: {
    deliveryMode: "direct",         // 直接投递或队列
    sendText: async (params) => Result,
    sendFile: async (params) => Result
  },

  status: {
    probe: async (account) => HealthStatus  // 健康检查
  }
}
```

### 4.2 WebSocket 消息协议

#### 4.2.1 客户端 → 服务器

| 类型 | 描述 | 必需字段 | 可选字段 |
|------|------|----------|----------|
| auth | 认证 | token | deviceInfo |
| chat | 发送消息 | content, sessionId, messageId | threadId, attachments |
| stop | 停止生成 | messageId | - |
| ping | 心跳 | - | - |

#### 4.2.2 服务器 → 客户端

| 类型 | 描述 | 字段 |
|------|------|------|
| connected | 连接建立 | clientId, sessionId, timestamp |
| auth_success | 认证成功 | userId |
| auth_failed | 认证失败 | error |
| message_received | 消息已接收 | messageId |
| message | AI 完整消息 | id, role, content, timestamp |
| chunk | 流式块 | content, index |
| stream_end | 流式结束 | - |
| stopped | 已停止 | messageId |
| error | 错误 | code, message |
| pong | 心跳响应 | timestamp |
| server_closing | 服务关闭 | reason |

### 4.3 HTTP REST API

#### 4.3.1 端点列表

| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| GET | /health | 否 | 健康检查 |
| GET | /config | 否 | 获取配置 |
| POST | /auth | 否 | 获取 Token |
| POST | /upload | 是 | 上传文件 |

#### 4.3.2 错误响应格式
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {},
    "requestId": "uuid-for-tracing"
  }
}
```

---

## 5. 非功能性需求

### 5.1 性能需求 (PERF)

**PERF-001: 并发连接**
- **需求**: 单实例支持 ≥ 1000 并发 WebSocket 连接
- **测试条件**: 每个连接每 10 秒发送一条消息
- **验收**: CPU < 70%, 内存 < 1GB

**PERF-002: 消息延迟**
- **首包延迟**: 用户发送 → 首字返回 < 500ms (P95)
- **转发延迟**: Gateway → 浏览器 < 10ms (P99)
- **认证延迟**: < 100ms (P99)

**PERF-003: 吞吐量**
- **消息处理**: ≥ 1000 消息/秒
- **文件上传**: ≥ 10MB/s 持续上传速度

**PERF-004: 启动时间**
- **冷启动**: < 3 秒 (从 register 到服务可用)
- **热重载**: < 1 秒 (配置变更)

### 5.2 可靠性需求 (REL)

**REL-001: 可用性**
- **目标**: 99.9% (月度停机 < 43 分钟)
- **故障恢复**: 自动重连 Gateway，无需人工干预

**REL-002: 数据持久化**
- **消息不丢失**: 至少一次投递 (at-least-once)
- **断线恢复**: 支持 Session 恢复 (通过 sessionId)

**REL-003: 优雅降级**
- **Gateway 不可用时**: 缓存消息，恢复后重传
- **高负载时**: 拒绝新连接，保护现有连接

### 5.3 安全需求 (SEC)

**SEC-001: 传输安全**
- **生产环境**: 强制 WSS (WebSocket Secure)
- **证书**: 支持自定义 TLS 证书
- **HSTS**: 支持 HTTP Strict Transport Security

**SEC-002: 身份认证**
- **JWT**: HS256 算法，Secret ≥ 256 bit
- **Token 过期**: 默认 2 小时，可配置
- **刷新机制**: 支持 Refresh Token (可选)

**SEC-003: 访问控制**
- **CORS**: 可配置允许来源，默认拒绝跨域
- **Origin 验证**: 验证 WebSocket Origin 头
- **IP 白名单**: 支持限制连接 IP (可选)

**SEC-004: 输入验证**
- **消息长度**: 最大 4000 字符
- **文件类型**: 白名单校验 MIME type
- **文件大小**: 最大 50MB
- **JSON 深度**: 最大 10 层嵌套
- **特殊字符**: 过滤控制字符 (0x00-0x1F)

**SEC-005: 防护机制**
- **速率限制**: 每用户 100 条/分钟
- **连接限制**: 每 IP 10 个并发连接
- **心跳超时**: 90 秒无响应断开
- **Payload 大小**: WebSocket 帧最大 10MB

### 5.4 可维护性需求 (MAINT)

**MAINT-001: 日志**
- **级别**: debug, info, warn, error
- **格式**: JSON，包含 timestamp, level, message, context
- **轮转**: 按天轮转，保留 7 天
- **内容**: 连接事件、消息收发、错误、性能指标

**MAINT-002: 监控指标**
- **连接数**: 当前活跃连接数
- **消息量**: QPS (每秒消息数)
- **延迟**: P50/P95/P99 消息延迟
- **错误率**: 每秒错误数
- **资源使用**: CPU、内存、文件描述符

**MAINT-003: 配置热更新**
- **支持**: CORS 配置、日志级别、限流参数
- **不支持**: 端口、认证密钥 (需重启)

### 5.5 兼容性需求 (COMPAT)

**COMPAT-001: 浏览器兼容**
- **Chrome**: ≥ 90
- **Firefox**: ≥ 88
- **Safari**: ≥ 14
- **Edge**: ≥ 90

**COMPAT-002: Gateway 版本**
- **最低**: OpenClaw 2026.2.0
- **推荐**: OpenClaw 2026.3.0+

**COMPAT-003: 协议版本**
- **WebSocket**: RFC 6455
- **HTTP**: HTTP/1.1 或 HTTP/2

---

## 6. 数据模型

### 6.1 配置数据
```yaml
PluginConfig:
  port: number          # 服务端口
  host: string          # 绑定地址
  cors:
    origins: string[]   # 允许的来源
    credentials: bool   # 允许凭证
  auth:
    type: enum[jwt, apikey]
    secret: string      # JWT 密钥
    expiration: number  # Token 过期时间(秒)
  limits:
    maxConnections: number      # 最大连接数
    maxMessageSize: number      # 最大消息大小(字节)
    maxFileSize: number         # 最大文件大小(字节)
    rateLimitPerMinute: number  # 每分钟限制
  accounts:
    [accountId]:
      enabled: bool
      apiKey?: string
      webhookUrl?: string
```

### 6.2 运行时数据
```yaml
WebClient:
  id: string            # 连接 ID
  ws: WebSocket         # WebSocket 实例
  userId?: string       # 认证用户 ID
  sessionId: string     # 会话 ID
  accountId: string     # 账户 ID
  isAuthenticated: bool
  connectedAt: timestamp
  lastPingAt: timestamp
```

---

## 7. 验收标准

### 7.1 功能验收

| 用例 | 步骤 | 预期结果 |
|------|------|----------|
| UC-001: 正常对话 | 1. 连接 WebSocket<br>2. 认证<br>3. 发送消息 | 收到 AI 回复 |
| UC-002: 流式输出 | 1. 发送 stream=true 的消息 | 实时收到逐字输出 |
| UC-003: 断线重连 | 1. 连接并认证<br>2. 断开网络<br>3. 恢复网络 | 自动重连并恢复会话 |
| UC-004: 多会话 | 1. 创建会话 A<br>2. 创建会话 B<br>3. 切换会话 | 消息隔离，上下文正确 |
| UC-005: 文件上传 | 1. 选择图片<br>2. 上传<br>3. 发送 | 消息包含图片 URL |
| UC-006: 并发压力 | 100 用户同时对话 | 响应时间 < 1s，无错误 |

### 7.2 性能验收
- 并发 1000 连接，CPU < 70%
- 消息转发延迟 P99 < 10ms
- 内存使用稳定，无泄漏 (24 小时测试)

### 7.3 安全验收
- 未认证连接无法发送消息
- 过期 Token 被拒绝
- 跨域请求被阻止 (未配置时)
- 大文件上传被拦截

---

## 8. 附录

### 8.1 错误码表

| 错误码 | 描述 | HTTP 状态 | 重试策略 |
|--------|------|-----------|----------|
| AUTH_001 | Token 格式错误 | 401 | 否 |
| AUTH_002 | Token 过期 | 401 | 刷新 Token |
| MSG_001 | 未认证 | 403 | 否 |
| MSG_002 | 消息格式错误 | 400 | 否 |
| MSG_003 | 消息过长 | 413 | 否 |
| CONN_001 | 连接数超限 | 503 | 是 (指数退避) |
| RATE_001 | 速率限制 | 429 | 是 (1分钟后) |

### 8.2 术语表
- **WebSocket**: 全双工通信协议
- **JWT**: JSON Web Token
- **CORS**: 跨域资源共享
- **P95/P99**: 百分位延迟指标

### 8.3 参考实现
- OpenClaw 内置 Telegram Channel
- OpenClaw 内置 Discord Channel
