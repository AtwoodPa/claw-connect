# Cursor 开发实战指南：OpenClaw Web Channel 全栈项目

## 1. 项目初始化策略

### 1.1 推荐开发顺序
```
Phase 1: 后端插件 (Backend Plugin)
  └── 先让 AI 理解 OpenClaw 架构
  └── 生成核心 Channel Plugin 代码
  └── 本地测试与 Gateway 集成

Phase 2: 前端 SDK (Frontend SDK)
  └── 生成纯 TypeScript 核心 SDK (框架无关)
  └── 测试与后端插件的连通性

Phase 3: Vue 组件库 (Vue UI)
  └── 基于 SDK 开发 Vue 组件
  └── 集成完整聊天界面
```

### 1.2 目录结构规划
```
openclaw-web-project/
├── openclaw-web-channel/          # 后端插件 (Phase 1)
│   ├── src/
│   ├── package.json
│   └── openclaw.plugin.json
│
├── packages/
│   ├── sdk/                       # 前端核心 SDK (Phase 2)
│   │   ├── src/
│   │   └── package.json
│   │
│   └── vue/                       # Vue 组件库 (Phase 3)
│       ├── src/
│       └── package.json
│
└── playground/                    # 测试应用
    └── vue-app/
```

---

## 2. Cursor 核心功能使用

### 2.1 Composer (⌘I) - 多文件编辑
**使用场景**: 同时修改多个相关文件

**操作步骤**:
1. 按 `⌘I` (Mac) 或 `Ctrl+I` (Windows) 打开 Composer
2. 点击 "+" 添加多个文件到上下文
3. 输入需求，Cursor 会同时修改所有相关文件

**示例 - 添加新功能到多个文件**:
```
同时修改以下文件，添加图片上传功能：
- src/server.ts: 添加 /upload 路由处理图片上传
- src/channel.ts: 添加 sendFile 方法实现
- src/types.ts: 添加 FileMessage 类型定义

要求：
1. 使用 multer 处理 multipart/form-data
2. 上传成功后返回 CDN URL
3. 类型定义包含 filename, url, mimeType, size
```

### 2.2 Chat (⌘L) - 问答与解释
**使用场景**: 询问代码逻辑、调试错误、学习架构

**最佳实践**:
- 选中代码后按 `⌘L`，自动带上代码上下文
- 使用 `@` 引用文件，例如 `@package.json`
- 使用 `#` 引用符号，例如 `#WebSocketServer`

### 2.3 Tab 自动补全
**使用场景**: 快速编写重复代码

**技巧**:
- 输入注释描述需求，按 Tab 生成代码
- 输入函数名，按 Tab 生成实现骨架

**示例**:
```typescript
// 输入：
// 处理 WebSocket 连接关闭，清理客户端资源并通知 gateway

// 按 Tab 后生成：
private handleDisconnect(clientId: string) {
  const client = this.clients.get(clientId);
  if (client) {
    this.clients.delete(clientId);
    this.api.logger.info(`Client ${clientId} disconnected`);
    // 通知 gateway 会话结束
    this.ctx.call('session.end', { sessionId: client.sessionId });
  }
}
```

### 2.4 Cmd+K (Inline Edit) - 行内编辑
**使用场景**: 快速修改选中代码块

**操作**:
1. 选中要修改的代码
2. 按 `⌘K`
3. 输入修改指令
4. 按 `Enter` 应用

---

## 3. 后端插件开发 (Phase 1)

### Step 1: 创建项目骨架
**在 Cursor 中操作**:

1. 创建目录结构：
```bash
mkdir -p openclaw-web-channel/src/{handlers,utils}
cd openclaw-web-channel
```

2. 将以下提示词粘贴到 Cursor Chat：

```markdown
我是 OpenClaw 插件开发者。请帮我生成后端插件的初始文件。

背景：
- OpenClaw 是一个 AI Agent 平台，使用 Plugin SDK 扩展功能
- 我需要开发一个 Web Channel Plugin，让浏览器通过 WebSocket 连接 Gateway
- 参考文档：PRD_Cursor_WebChannelPlugin.md

请生成以下文件（按顺序）：

1. package.json
   - 模块类型: "type": "module"
   - 依赖: ws, express, cors, jsonwebtoken, zod, uuid
   - peerDependencies: openclaw >=2026.2.0
   - exports: "./dist/index.js"

2. tsconfig.json
   - target: ES2022
   - module: NodeNext
   - strict: true
   - outDir: ./dist

3. openclaw.plugin.json
   - id: "web-channel"
   - name: "OpenClaw Web Channel"
   - configSchema: 包含 port, host, cors, auth, accounts

4. src/types.ts
   - 定义 PluginConfig, WebClient, Message, StreamChunk 等核心类型
   - 使用严格的 TypeScript 类型

请逐个生成文件，每个文件生成后我会确认再继续下一个。
```

### Step 2: 生成核心逻辑文件
**提示词**:
```markdown
继续生成核心实现文件：

1. src/config.ts
   - 使用 Zod 定义 pluginConfigSchema
   - 包含 port, host, cors, auth(JWT), accounts 的验证规则
   - 导出 PluginConfig 类型

2. src/utils/logger.ts
   - 简单的日志工具，支持 info, error, debug 级别
   - 添加时间戳和标签

3. src/utils/auth.ts
   - JWT 验证工具函数
   - 支持生成 token 和验证 token
   - 错误处理

要求：
- 所有函数必须添加 JSDoc 注释
- 使用 TypeScript 严格模式
- 处理边界情况（如配置缺失、验证失败）
```

### Step 3: 生成服务器实现
**提示词**:
```markdown
生成 WebSocket/HTTP 服务器实现：

文件: src/server.ts

要求：
1. 创建 WebChannelServer 类
2. 使用 Express 创建 HTTP 服务器
3. 集成 'ws' 库创建 WebSocketServer
4. 实现以下方法：
   - constructor: 初始化 Express 和 WebSocket
   - setupRoutes: 设置 /health, /auth, /config 路由
   - setupWebSocket: 处理 connection, message, close 事件
   - handleMessage: 处理 'auth', 'chat', 'ping' 消息类型
   - start: 启动服务器监听
   - stop: 优雅关闭
   - getConnection: 根据 sessionId 获取 WebSocket 连接

关键功能：
- JWT 认证中间件
- CORS 跨域配置
- 心跳检测（ping/pong）
- 客户端管理（Map<string, WebClient>）
- 错误处理和日志记录

参考类型定义（来自 types.ts）：
interface WebClient {
  id: string;
  ws: WebSocket;
  userId?: string;
  sessionId: string;
  isAuthenticated: boolean;
}
```

### Step 4: 生成 Channel Plugin
**提示词**:
```markdown
生成 OpenClaw Channel Plugin 实现：

文件: src/channel.ts

要求：
1. 导出 createWebChannel(config, logger) 函数
2. 返回 ChannelPlugin 对象，包含：
   - id: 'web-channel'
   - meta: { label, description, docsPath }
   - capabilities: { chatTypes, supportsAttachments, supportsStreaming }
   - config: { listAccountIds, resolveAccount }
   - outbound: { sendText, sendFile }
   - status: { probe }

3. outbound.sendText 实现：
   - 通过 WebSocket 发送消息给浏览器
   - 处理连接断开的情况
   - 返回 { ok: boolean, error?: string }

4. 与 server.ts 的协作：
   - 使用全局 Map 或 EventEmitter 在 channel 和 server 间通信
   - server 收到消息后调用 Gateway API
   - Gateway 回复后通过 channel.outbound 发送给客户端

请确保类型定义完整，符合 OpenClaw Plugin SDK 规范。
```

### Step 5: 生成入口文件
**提示词**:
```markdown
生成插件入口文件：

文件: src/index.ts

要求：
1. 导入 OpenClawPluginApi 类型
2. 导出默认 register(api) 函数
3. 在 register 中：
   - 获取 pluginConfig
   - 使用 Zod 验证配置
   - 创建 logger
   - 调用 api.registerChannel({ plugin: createWebChannel(...) })
   - 调用 api.registerService({ id: 'web-channel-server', start, stop })
   - 可选：注册 HTTP 路由和 CLI 命令

4. 处理插件生命周期：
   - start: 创建并启动 WebChannelServer
   - stop: 优雅关闭服务器

请提供完整的实现，包含错误处理和日志记录。
```

### Step 6: 编译和测试
**在 Terminal 中执行**:
```bash
# 安装依赖
npm install

# 编译 TypeScript
npm run build

# 检查编译结果
ls -la dist/
```

**如果编译报错，在 Cursor Chat 中**:
```markdown
编译报错，请帮我修复：
[粘贴错误信息]

相关文件：
@src/server.ts
@src/channel.ts
```

---

## 4. 前端 SDK 开发 (Phase 2)

### Step 1: 创建 SDK 项目
```bash
mkdir -p packages/sdk/src
cd packages/sdk
```

**Cursor 提示词**:
```markdown
生成前端核心 SDK（框架无关，纯 TypeScript）：

项目: @openclaw/web-channel-sdk

文件结构：
1. package.json
   - type: "module"
   - main: "./dist/index.js"
   - types: "./dist/index.d.ts"
   - 依赖: eventemitter3 (事件管理)

2. tsconfig.json
   - target: ES2020
   - module: ESNext
   - declaration: true (生成 .d.ts)

3. src/types.ts
   - 定义接口: OpenClawClientConfig, Message, Session, ConnectionState

4. src/OpenClawClient.ts (核心类)
   - 功能：
     - WebSocket 连接管理（自动重连、心跳）
     - 消息发送和接收（Promise-based API）
     - 流式输出支持（AsyncGenerator）
     - 事件订阅（on/off/emit）

   - 方法：
     - constructor(config)
     - connect(): Promise<void>
     - disconnect(): void
     - sendMessage(text, options): Promise<Message>
     - streamMessage(text, options): AsyncGenerator<StreamChunk>
     - stopGeneration(messageId): void
     - getHistory(sessionId): Promise<Message[]>

   - 事件：
     - 'connected' | 'disconnected' | 'reconnecting' | 'message' | 'error'

5. src/index.ts
   - 导出 OpenClawClient 类和所有类型

要求：
- 使用原生 WebSocket API（不依赖框架）
- 支持 Node.js 和浏览器环境
- 完整的 JSDoc 注释
- 错误处理和边界情况
```

### Step 2: 测试 SDK
**提示词**:
```markdown
为 SDK 生成测试文件：

1. tests/client.test.ts
   - 使用 vitest
   - 测试连接、重连、消息发送
   - 使用 mock WebSocket

2. tests/stream.test.ts
   - 测试流式输出
   - 模拟 chunked 响应

生成测试代码，使用 describe/it/expect 模式。
```

---

## 5. Vue 组件库开发 (Phase 3)

### Step 1: 创建 Vue 项目
```bash
mkdir -p packages/vue/src/{components,composables,stores,utils,styles,locales}
cd packages/vue
```

**Cursor 提示词（分批次生成）**:

#### 批次 1: 基础设施
```markdown
生成 Vue 组件库的基础设施：

项目: @openclaw/web-channel-vue
技术栈: Vue 3.4 + TypeScript + Vite + Pinia

1. package.json
   - peerDependencies: vue ^3.4.0
   - dependencies: @openclaw/web-channel-sdk, pinia, marked, highlight.js, vue-i18n
   - devDependencies: @vitejs/plugin-vue, typescript, vue-tsc

2. vite.config.ts
   - 配置为 library 模式
   -  external: ['vue', 'pinia']
   -  cssCodeSplit: true

3. tsconfig.json
   - 严格模式
   - 支持 Vue 单文件组件

4. src/types.ts
   - 继承 SDK 类型，添加 UI 相关类型
   - Theme, Locale, ChatProps 等

5. src/index.ts
   - install(app, options) 函数
   - 导出所有组件和 composables

先生成这 5 个文件，我会检查后再继续。
```

#### 批次 2: 状态管理 (Pinia Stores)
```markdown
生成 Pinia 状态管理 stores：

1. src/stores/chat.ts
   - State: messages(Map), currentSessionId
   - Actions: addMessage, updateMessage, deleteMessage, loadHistory
   - Getters: currentMessages

2. src/stores/session.ts
   - State: sessions[], currentId
   - Actions: createSession, selectSession, deleteSession, resetSession, pinSession
   - Getters: sortedSessions, currentSession

3. src/stores/connection.ts
   - State: status, reconnectCount, lastError
   - Actions: setStatus, incrementReconnect, reset

4. src/stores/settings.ts
   - State: theme, locale
   - Actions: setTheme, setLocale
   - 使用 localStorage 持久化

要求：
- 使用 Composition API 风格 (defineStore + 函数)
- 完整的 TypeScript 类型
- 添加 $reset 方法
```

#### 批次 3: Composables
```markdown
生成 Vue Composables：

1. src/composables/useWebSocket.ts
   - 包装 SDK 的 OpenClawClient
   - 提供响应式状态: isConnected, reconnectCount
   - 自动重连逻辑
   - 组件卸载时断开连接

2. src/composables/useChat.ts
   - 发送消息（支持队列）
   - 处理流式输出
   - 中止生成
   - 自动滚动控制

3. src/composables/useTheme.ts
   - 支持 'light' | 'dark' | 'system'
   - 切换 CSS 变量
   - 监听系统主题变化

4. src/composables/useI18n.ts
   - 封装 vue-i18n
   - 自动检测浏览器语言
   - 切换语言

5. src/composables/useAutoScroll.ts
   - 智能滚动：新消息自动到底部
   - 用户滚动上去时暂停自动滚动
   - 显示"回到底部"按钮

要求：
- 使用 ref/reactive/computed/onMounted/onUnmounted
- 导出清晰的类型定义
- 添加使用示例注释
```

#### 批次 4: 核心组件
```markdown
生成核心 Vue 组件（分 2-3 个文件生成，避免太长）：

第一部分：
1. src/components/MessageItem.vue
   - Props: message, isStreaming
   - 功能：
     - Markdown 渲染（使用 marked + highlight.js）
     - 代码块复制按钮（hover 显示）
     - 打字机光标（isStreaming 时显示 ▋）
     - 长按菜单（移动端支持）
   - 样式：支持亮色/暗色主题

2. src/components/MessageList.vue
   - 功能：
     - 虚拟滚动（大量消息时性能优化）
     - 加载历史（滚动到顶部触发）
     - 自动滚动控制
   - 事件：scroll-top, copy, preview-image

3. src/components/ChatInput.vue
   - 功能：
     - textarea 自适应高度
     - 快捷指令 /model, /think, /new, /clear
     - 图片上传预览
     - 发送按钮状态管理
   - 事件：send, upload, command, stop

先生成这 3 个组件，使用 <script setup lang="ts"> 语法。
```

#### 批次 5: 容器组件
```markdown
生成容器组件：

1. src/components/ChatContainer.vue
   - 整合所有子组件
   - Props: gatewayUrl, token, options
   - 使用 useWebSocket, useChat
   - 布局：侧边栏 + 主聊天区
   - 处理连接状态显示

2. src/components/SessionList.vue
   - 会话列表展示
   - 新建、删除、重置、置顶功能
   - 右键菜单支持
   - 拖拽排序（可选）

3. src/components/SessionItem.vue
   - 单个会话项
   - 编辑标题（双击或点击编辑按钮）
   - 显示消息数和最后时间

4. src/components/ImagePreview.vue
   - 全屏图片预览
   - 手势缩放（移动端）
   - 键盘导航（左右切换）
```

#### 批次 6: 样式和主题
```markdown
生成样式文件：

1. src/styles/variables.css
   - CSS 变量定义
   - 颜色、尺寸、动画、z-index

2. src/styles/themes/light.css
   - 亮色主题配色

3. src/styles/themes/dark.css
   - 暗色主题配色

4. src/styles/index.css
   - 导入 variables 和 themes
   - 全局重置样式
   - 组件基础样式

5. src/components/MessageItem.vue 的 scoped CSS
   - Markdown 内容样式
   - 代码块高亮样式
   - 消息气泡样式
```

#### 批次 7: 国际化
```markdown
生成国际化文件：

1. src/locales/zh-CN.json
   - chat: { newSession, send, think, stop, disconnected, reconnect }
   - session: { title, empty, delete, reset, pin }
   - menu: { copy, copyCode, quote, delete }
   - commands: { model, think, new, clear }

2. src/locales/en.json
   - 对应英文翻译

3. src/locales/index.ts
   - 导出 messages
   - 自动检测浏览器语言
```

#### 批次 8: 工具函数
```markdown
生成工具函数：

1. src/utils/markdown.ts
   - 配置 marked
   - 集成 highlight.js
   - 添加代码复制按钮渲染

2. src/utils/format.ts
   - generateId(): 生成唯一 ID
   - formatTime(timestamp): 格式化时间显示
   - formatFileSize(bytes): 格式化文件大小

3. src/utils/queue.ts
   - 消息队列实现
   - 先进先出，支持优先级
```

---

## 6. Cursor 高级技巧

### 6.1 使用 @ 引用上下文
在 Chat 或 Composer 中：
- `@file.ts` - 引用整个文件
- `@folder/` - 引用整个文件夹
- `#SymbolName` - 引用特定符号（函数、类）

**示例**:
```markdown
请修改 @src/server.ts 中的 handleMessage 方法，
添加对 'typing' 消息类型的处理。

参考 #WebClient 类型的定义。
```

### 6.2 使用 / 命令
- `/fix` - 修复选中的代码
- `/explain` - 解释选中的代码
- `/doc` - 为选中的代码生成文档
- `/test` - 为选中的代码生成测试

### 6.3 多文件重构
**场景**: 重命名一个广泛使用的接口

**操作**:
1. 选中旧接口名
2. 按 `⌘I` 打开 Composer
3. 输入："将接口名从 OldName 重命名为 NewName，并更新所有引用"
4. Cursor 会自动修改所有相关文件

### 6.4 调试技巧
**遇到报错时**:
```markdown
运行报错：
```
[粘贴完整错误堆栈]
```

相关文件：
@src/server.ts:45
@src/channel.ts:78

请分析错误原因并修复。
```

**性能优化时**:
```markdown
这段代码在处理大量消息时有性能问题，请优化：
[选中代码]

要求：
1. 时间复杂度从 O(n²) 降到 O(n)
2. 使用 Map 替代数组查找
3. 添加虚拟滚动支持
```

---

## 7. 测试与迭代

### 7.1 本地测试流程
```bash
# 1. 启动 OpenClaw Gateway
cd openclaw-repo
openclaw gateway

# 2. 安装并启动后端插件
cd openclaw-web-channel
npm link  # 本地链接
openclaw plugin install ./

# 3. 启动测试前端
 cd playground/vue-app
 npm run dev
```

### 7.2 使用 Cursor 调试
**在 Cursor Terminal 中**:
```bash
# 查看 Gateway 日志
tail -f ~/.openclaw/logs/gateway.log

# 测试 WebSocket 连接
wscat -c ws://localhost:3000/ws
```

**在 Cursor Chat 中分析日志**:
```markdown
Gateway 日志显示以下错误：
```
[ERROR] WebChannel: Invalid token format
    at verifyToken (src/utils/auth.ts:23)
```

请检查 @src/utils/auth.ts 的 JWT 验证逻辑，
并确保与 @src/server.ts 的 token 生成逻辑一致。
```

### 7.3 迭代优化提示词模板

**性能优化**:
```markdown
请优化 @src/components/MessageList.vue 的性能：

当前问题：
- 渲染 1000+ 消息时卡顿
- 滚动不流畅

要求：
1. 实现虚拟滚动（只渲染视口内消息）
2. 使用 vue-virtual-scroller 或自研实现
3. 图片懒加载
4. 保持现有功能不变
```

**功能增强**:
```markdown
为 ChatInput.vue 添加以下功能：

1. @ 提及功能（提及 Agent 或其他用户）
2. 输入时显示 typing indicator
3. 支持粘贴图片直接上传

参考文件：
@src/components/ChatInput.vue
@src/composables/useImageUpload.ts
```

---

## 8. 发布准备

### 8.1 生成 README
**提示词**:
```markdown
为项目生成 README.md：

项目: openclaw-web-channel (后端插件)

包含：
1. 项目简介
2. 安装方法
3. 配置示例 (openclaw.json)
4. API 文档
5. 前端集成示例
6. 常见问题

风格：简洁清晰，包含代码示例
```

### 8.2 生成 CHANGELOG
**提示词**:
```markdown
根据 git 提交记录生成 CHANGELOG.md：

格式遵循 Keep a Changelog
版本号使用 Semantic Versioning

分类：Added, Changed, Fixed, Removed
```

---

## 9. 常见问题解决

### Q: Cursor 生成的代码不符合 OpenClaw API
**解决**: 提供 API 文档片段作为上下文
```markdown
根据以下 OpenClaw Plugin API 文档生成代码：

```typescript
interface OpenClawPluginApi {
  registerChannel(registration: { plugin: ChannelPlugin }): void;
  registerService(service: { 
    id: string; 
    start: (ctx: PluginContext) => Promise<void>;
    stop: () => Promise<void>;
  }): void;
  // ...
}
```

请生成符合此接口的 src/index.ts
```

### Q: 生成的代码有类型错误
**解决**: 粘贴错误信息并要求修复
```markdown
TypeScript 报错：
```
Type '(client: WebClient) => void' is not assignable to type '(client: WebSocket) => void'.
  Types of parameters 'client' are incompatible.
```

相关代码：
@src/server.ts:67

请修复类型不匹配问题。
```

### Q: Vue 组件样式不生效
**解决**: 检查 CSS 变量和作用域
```markdown
MessageItem.vue 的样式在暗色主题下不生效，
请检查：
1. CSS 变量是否正确使用
2. scoped 样式是否穿透到 Markdown 内容
3. 暗色主题类名是否正确添加

相关文件：
@src/components/MessageItem.vue
@src/styles/themes/dark.css
```

---

## 10. 完整开发 Checklist

### Phase 1: 后端插件
- [ ] 项目骨架 (package.json, tsconfig.json, openclaw.plugin.json)
- [ ] 类型定义 (src/types.ts)
- [ ] 配置验证 (src/config.ts)
- [ ] 工具函数 (src/utils/*.ts)
- [ ] WebSocket 服务器 (src/server.ts)
- [ ] Channel Plugin (src/channel.ts)
- [ ] 入口文件 (src/index.ts)
- [ ] 编译测试
- [ ] 与 Gateway 集成测试

### Phase 2: 前端 SDK
- [ ] SDK 项目配置
- [ ] OpenClawClient 类
- [ ] 类型定义
- [ ] 单元测试
- [ ] 构建输出

### Phase 3: Vue 组件库
- [ ] Vue 项目配置
- [ ] Pinia Stores
- [ ] Composables
- [ ] 基础组件 (MessageItem, MessageList, ChatInput)
- [ ] 容器组件 (ChatContainer, SessionList)
- [ ] 主题样式
- [ ] 国际化
- [ ] 工具函数
- [ ] 文档和示例

---

**提示**: 每完成一个 Phase，使用 `⌘Shift+P` → "Developer: Reload Window" 刷新 Cursor，确保上下文清晰。
