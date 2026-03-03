# OpenClaw Web Channel Vue UI - 详细需求规格说明书 (SRS)

**版本**: 1.0  
**日期**: 2026-03-03  
**状态**: Draft  

---

## 1. 引言

### 1.1 目的
本文档详细定义 OpenClaw Web Channel Vue UI 组件库的功能需求、组件接口、交互设计和验收标准。

### 1.2 范围
- **包含**: Vue 3 组件、状态管理、组合式函数、主题系统、国际化
- **不包含**: 后端逻辑、AI 模型交互、移动原生应用

### 1.3 用户角色
| 角色 | 描述 | 核心需求 |
|------|------|----------|
| **终端用户** | 使用聊天界面与 AI 对话 | 流畅、直观、响应快 |
| **前端开发者** | 集成组件到项目 | 易用、可定制、文档完善 |
| **设计师** | 调整 UI 风格 | 主题可变、样式隔离 |

---

## 2. 功能性需求

### 2.1 组件架构

#### 2.1.1 组件层次结构
```
ChatContainer (主容器)
├── ChatHeader (顶部栏)
│   └── ConnectionStatus (连接状态指示器)
├── ChatBody
│   ├── SessionList (会话侧边栏)
│   │   ├── SessionItem (会话项)
│   │   └── NewSessionButton (新建按钮)
│   └── ChatMain
│       ├── MessageList (消息列表)
│       │   └── MessageItem (消息项)
│       │       ├── MessageAvatar (头像)
│       │       ├── MessageContent (内容区)
│       │       │   ├── MarkdownRenderer (Markdown 渲染)
│       │       │   └── ImageGrid (图片网格)
│       │       └── MessageActions (操作按钮)
│       ├── ScrollToBottom (回到底部按钮)
│       └── ChatInput (输入区)
│           ├── ImagePreviewBar (图片预览条)
│           ├── QuickCommands (快捷指令面板)
│           └── InputControls (输入控制)
└── ImagePreview (全局图片预览层)
```

### 2.2 详细功能需求

#### 2.2.1 消息展示 (MSG-DISP)

**MSG-DISP-001: 消息渲染**
- **描述**: 正确渲染不同类型的消息
- **输入**: Message 对象
- **处理**:
  - user 角色: 右侧对齐，蓝色背景，白色文字
  - assistant 角色: 左侧对齐，灰色背景，黑色文字 (亮色主题)
  - system 角色: 居中，灰色文字，无背景
- **验收**:
  - 文本正确显示
  - 特殊字符正确转义 (XSS 防护)
  - 长文本自动换行

**MSG-DISP-002: Markdown 渲染**
- **支持元素**:
  - 标题: h1-h6，带锚点链接
  - 段落: p，自动换行
  - 列表: ul/ol，支持嵌套
  - 代码: 行内代码 `code` 和代码块 ```code```
  - 引用: blockquote，左侧边框
  - 链接: a，新窗口打开
  - 表格: table，斑马纹
  - 分隔线: hr
  - 强调: **bold**, *italic*, ~~strikethrough~~
- **代码高亮**:
  - 支持语言: JavaScript, TypeScript, Python, Java, Go, Rust, Bash, SQL, JSON, YAML, HTML, CSS, Vue, Markdown
  - 主题: 跟随主主题 (亮色/暗色)
  - 显示语言标签
- **验收**:
  - 所有 Markdown 元素正确渲染
  - 代码块语法高亮正确
  - XSS 防护 (过滤危险标签)

**MSG-DISP-003: 代码块复制**
- **触发**: 鼠标悬停代码块
- **UI**: 右上角显示"复制"按钮
- **交互**: 点击后复制到剪贴板，按钮文字变为"已复制" (2秒后恢复)
- **快捷键**: 支持 Ctrl+C 复制选中代码
- **验收**: 复制的内容格式正确，无多余缩进

**MSG-DISP-004: 图片消息**
- **展示**: 网格布局 (1张全宽, 2张均分, 3+张三列)
- **缩略**: 统一高度 200px，object-fit: cover
- **预览**: 点击打开全屏预览 (ImagePreview 组件)
- **加载**: 显示骨架屏，加载完成后淡入
- **错误**: 加载失败显示占位图和重试按钮
- **验收**: 图片比例正确，加载流畅

**MSG-DISP-005: 流式输出效果**
- **打字机效果**: 文字逐字出现，非整段刷新
- **光标**: 末尾显示闪烁光标 ▋ (CSS animation)
- **自动滚动**: 新内容出现时自动滚动到底部
- **性能**: 使用 requestAnimationFrame 优化，不卡顿
- **验收**: 60fps 流畅，光标闪烁正常

**MSG-DISP-006: 消息时间戳**
- **格式**: 
  - 今天: "12:30"
  - 昨天: "昨天 12:30"
  - 更早: "2024-03-01 12:30"
- **位置**: 消息气泡下方，小字号，灰色
- **验收**: 时间准确，格式符合 locale

#### 2.2.2 交互功能 (INTERACT)

**INTERACT-001: 消息长按菜单**
- **触发**: 
  - 移动端: 长按 500ms
  - 桌面端: 右键点击
- **菜单位置**: 光标位置，边界检测 (避免超出屏幕)
- **菜单项**:
  - 复制文本 (Copy Text)
  - 复制代码块 (Copy Code) - 仅当包含代码时显示
  - 引用回复 (Quote)
  - 删除消息 (Delete) - 仅用户消息，红色警告
- **动画**: 淡入 150ms
- **关闭**: 点击外部或按 ESC
- **验收**: 菜单功能正常，移动端手势不误触

**INTERACT-002: 滚动控制**
- **自动滚动**: 
  - 用户在底部时，新消息自动滚动到底部
  - 用户滚动上去 (>100px) 时，暂停自动滚动
- **回到底部按钮**:
  - 显示条件: 用户不在底部且有新消息
  - 位置: 右下角，浮动
  - 内容: "↓ 新消息" 或消息数角标
  - 点击: 平滑滚动到底部
- **加载更多**: 滚动到顶部触发，显示 loading，加载历史消息
- **验收**: 滚动流畅，不抖动，历史消息无缝衔接

**INTERACT-003: 自适应输入框**
- **高度调整**: 
  - 初始: 44px (单行)
  - 最大: 200px (约 8 行)
  - 自动根据内容调整
- **换行**: Shift+Enter 换行，Enter 发送
- **输入法**: 支持中文、日文等输入法 (composition events)
- **验收**: 输入流畅，高度变化平滑

**INTERACT-004: 快捷指令**
- **触发**: 输入 "/" 显示指令面板
- **指令列表**:
  - `/model [name]` - 切换 AI 模型
  - `/think [question]` - 深度思考模式
  - `/new` - 新建会话
  - `/clear` - 清空当前会话历史
  - `/help` - 显示帮助信息
- **面板**: 浮动在输入框上方，可键盘上下选择，Enter 确认
- **自动完成**: 输入 "/m" 自动筛选出 model
- **验收**: 指令响应正确，面板不遮挡内容

**INTERACT-005: 图片上传**
- **选择方式**:
  - 点击附件按钮选择文件
  - 拖拽文件到输入区
  - 粘贴图片 (Ctrl+V)
- **预览**: 发送前显示缩略图，可删除 (× 按钮)
- **限制**: 
  - 格式: image/* (png, jpg, gif, webp)
  - 大小: 单张最大 10MB
  - 数量: 单次最多 5 张
- **压缩**: 超大图片自动压缩到 1920px 宽
- **上传**: 先上传到服务器获取 URL，再发送消息
- **进度**: 显示上传进度条
- **验收**: 上传稳定，错误有提示

#### 2.2.3 会话管理 (SESSION)

**SESSION-001: 会话列表展示**
- **布局**: 左侧边栏，宽度 260px (可折叠)
- **项内容**:
  - 标题 (可编辑，双击或点击编辑按钮)
  - 最后消息预览 (截断 30 字符)
  - 时间 (相对时间: 刚刚/5分钟前/昨天/日期)
  - 消息数角标 (超过 99 显示 99+)
  - 置顶标记 (📌)
- **排序**: 置顶项在前，其余按更新时间倒序
- **空状态**: 显示 "暂无会话" 和新建按钮
- **验收**: 列表滚动流畅，数据实时同步

**SESSION-002: 新建会话**
- **触发**: 点击 "+" 按钮或输入 `/new`
- **行为**: 
  - 创建新 Session 对象
  - 切换到新会话
  - 输入框聚焦
- **默认标题**: "新会话" 或自动生成 (基于首条消息)
- **验收**: 新建后立即可用

**SESSION-003: 删除会话**
- **触发**: 右键菜单或左滑 (移动端)
- **确认**: 二次确认对话框 ("确定要删除此会话吗？")
- **行为**: 
  - 删除 Session 对象
  - 清空相关消息
  - 切换到其他会话 (或新建)
- **撤销**: 支持 5 秒内撤销 (Toast 提示)
- **验收**: 删除后数据清理彻底

**SESSION-004: 重命名会话**
- **触发**: 双击标题或右键菜单
- **编辑模式**: 输入框替换标题，Enter 保存，ESC 取消
- **验证**: 不能为空，最大 50 字符
- **验收**: 实时保存，无闪烁

**SESSION-005: 置顶会话**
- **触发**: 右键菜单 "置顶"
- **行为**: 移动到列表顶部，添加置顶标记
- **限制**: 最多置顶 5 个会话
- **验收**: 置顶状态持久化

**SESSION-006: 重置会话**
- **触发**: 右键菜单 "清空历史"
- **行为**: 
  - 清空该会话的所有消息
  - 保留会话 ID 和标题
  - 显示 "历史已清空" 系统消息
- **确认**: 二次确认
- **验收**: 重置后上下文清除，可重新开始对话

#### 2.2.4 系统功能 (SYSTEM)

**SYSTEM-001: 主题切换**
- **模式**:
  - 亮色 (Light): 白色背景，深色文字
  - 暗色 (Dark): 深色背景，浅色文字
  - 跟随系统 (System): 根据系统偏好自动切换
- **切换方式**: 
  - 设置面板选择
  - 快捷键 (如 Cmd+Shift+L)
- **持久化**: 保存到 localStorage
- **过渡**: 平滑过渡动画 300ms
- **CSS 变量**: 使用 CSS 自定义属性实现
- **验收**: 切换流畅，无闪烁，所有组件响应

**SYSTEM-002: 国际化 (i18n)**
- **语言包**:
  - 简体中文 (zh-CN)
  - 英文 (en)
- **内容**: 所有 UI 文本、提示信息、日期格式
- **检测**: 自动检测浏览器语言 (navigator.language)
- **切换**: 设置面板选择，实时生效
- **回退**: 缺失的键使用英文
- **验收**: 切换后全部文本更新，无硬编码中文

**SYSTEM-003: 自动重连**
- **检测**: WebSocket onclose/onerror 事件
- **策略**:
  - 指数退避: 3s, 6s, 9s, 12s, 15s (最大 5 次)
  - 超过 5 次显示 "连接失败，请检查网络"
- **UI**: 
  - 顶部栏显示连接状态 (绿/黄/红点)
  - 断开时显示 "正在重连... (第 n 次)"
  - 手动重连按钮
- **恢复**: 重连成功后恢复当前会话
- **验收**: 网络恢复后自动连接，消息不丢失

**SYSTEM-004: 消息队列**
- **场景**: 发送消息时，如果正在等待 AI 回复，新消息进入队列
- **UI**: 输入框下方显示 "等待发送: 2"
- **行为**: 
  - 当前回复完成后，自动发送队列中的下一条
  - 可取消队列中的消息 (× 按钮)
- **验收**: 队列顺序正确，无消息丢失

### 2.3 组件 Props 详细定义

#### 2.3.1 ChatContainer

| Prop | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| gatewayUrl | string | 是 | - | WebSocket 地址，如 "ws://localhost:3000" |
| token | string | 否 | - | JWT Token，可选 (如使用 API Key) |
| sessionId | string | 否 | - | 初始会话 ID，未提供则创建新会话 |
| userId | string | 否 | - | 用户标识 (用于多用户场景) |
| theme | ThemeConfig | 否 | { mode: 'system' } | 主题配置 |
| locale | string | 否 | 'auto' | 语言代码，'auto' 自动检测 |
| options | ChatOptions | 否 | {} | 高级选项 |

**ChatOptions 结构**:
```typescript
interface ChatOptions {
  autoScroll?: boolean;           // 默认 true
  enableTypingIndicator?: boolean; // 默认 true
  maxFileSize?: number;           // 默认 50MB (字节)
  allowedFileTypes?: string[];    // 默认 ['image/*']
  maxMessageLength?: number;      // 默认 4000
  reconnectMax?: number;          // 默认 5
  reconnectDelay?: number;        // 默认 3000 (ms)
}
```

**Events**:
| 事件名 | 参数 | 描述 |
|--------|------|------|
| connect | - | 连接成功 |
| disconnect | { code, reason } | 连接断开 |
| error | { error } | 发生错误 |
| message | { message, sessionId } | 收到新消息 |
| session-change | { sessionId } | 会话切换 |

#### 2.3.2 MessageItem

| Prop | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| message | Message | 是 | - | 消息对象 |
| isStreaming | boolean | 否 | false | 是否显示打字机光标 |
| showAvatar | boolean | 否 | true | 是否显示头像 |
| showTime | boolean | 否 | true | 是否显示时间戳 |
| enableCopy | boolean | 否 | true | 是否启用复制功能 |
| enableQuote | boolean | 否 | true | 是否启用引用功能 |
| avatarUrl | string | 否 | - | 自定义头像 URL |

**Events**:
| 事件名 | 参数 | 描述 |
|--------|------|------|
| copy | { text } | 复制文本 |
| copy-code | { code, language } | 复制代码块 |
| quote | { message } | 引用消息 |
| delete | { id } | 删除消息 |
| preview-image | { url } | 预览图片 |

#### 2.3.3 ChatInput

| Prop | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| modelValue | string | 是 | - | 输入内容 (v-model) |
| disabled | boolean | 否 | false | 是否禁用 |
| loading | boolean | 否 | false | 是否发送中 |
| placeholder | string | 否 | '输入消息...' | 占位文本 (支持 i18n key) |
| maxLength | number | 否 | 4000 | 最大长度 |
| enableImageUpload | boolean | 否 | true | 启用图片上传 |
| enableCommands | boolean | 否 | true | 启用快捷指令 |
| queuedCount | number | 否 | 0 | 队列中的消息数 |

**Events**:
| 事件名 | 参数 | 描述 |
|--------|------|------|
| send | { text, files } | 发送消息 |
| upload | { files } | 上传文件 |
| command | { command, args } | 触发快捷指令 |
| stop | - | 停止生成 |
| update:modelValue | string | 更新 v-model |

### 2.4 Composables 详细定义

#### 2.4.1 useChat

**功能**: 封装聊天核心逻辑

**参数**:
- sessionId?: string - 可选，指定会话 ID

**返回值**:
| 属性/方法 | 类型 | 描述 |
|-----------|------|------|
| messages | Ref<Message[]> | 当前会话消息列表 |
| isStreaming | Ref<boolean> | 是否正在流式输出 |
| isLoading | Ref<boolean> | 是否发送中 |
| send | (content, options?) => Promise<void> | 发送消息 |
| stop | () => void | 停止生成 |
| quote | (message) => void | 引用消息 |
| retry | (messageId) => void | 重发失败消息 |
| queue | Ref<QueuedMessage[]> | 待发送队列 |

#### 2.4.2 useWebSocket

**功能**: WebSocket 连接管理

**参数**:
- config: OpenClawClientConfig

**返回值**:
| 属性/方法 | 类型 | 描述 |
|-----------|------|------|
| status | Ref<'connected' \| 'disconnected' \| 'reconnecting' \| 'error'> | 连接状态 |
| reconnectCount | Ref<number> | 重连次数 |
| connect | () => Promise<void> | 手动连接 |
| disconnect | () => void | 断开连接 |
| reconnect | () => void | 手动重连 |
| send | (data) => void | 发送数据 |

#### 2.4.3 useTheme

**功能**: 主题管理

**返回值**:
| 属性/方法 | 类型 | 描述 |
|-----------|------|------|
| theme | Ref<'light' \| 'dark' \| 'system'> | 当前主题模式 |
| isDark | Ref<boolean> | 当前是否为暗色 |
| setTheme | (theme) => void | 设置主题 |
| toggle | () => void | 切换亮/暗 |

#### 2.4.4 useAutoScroll

**功能**: 智能滚动控制

**参数**:
- containerRef: Ref<HTMLElement>
- options?: { threshold?: number }

**返回值**:
| 属性/方法 | 类型 | 描述 |
|-----------|------|------|
| scrollToBottom | (behavior?: 'smooth' \| 'auto') => void | 滚动到底部 |
| isAtBottom | Ref<boolean> | 是否在底部 |
| showScrollButton | Ref<boolean> | 是否显示回到底部按钮 |
| disableAutoScroll | () => void | 禁用自动滚动 |
| enableAutoScroll | () => void | 启用自动滚动 |

### 2.5 Store 详细设计

#### 2.5.1 chat Store

**State**:
```typescript
interface ChatState {
  messages: Map<string, Message[]>;  // sessionId -> messages
  currentSessionId: string;
  streamingMessageId: string | null;
}
```

**Actions**:
- addMessage(sessionId, message): void
- updateMessage(sessionId, messageId, updates): void
- deleteMessage(sessionId, messageId): void
- clearMessages(sessionId): void
- setStreaming(sessionId, messageId): void
- appendStreamContent(sessionId, messageId, chunk): void

**Getters**:
- currentMessages: Message[]
- hasMessages: boolean
- lastMessage: Message | undefined

#### 2.5.2 session Store

**State**:
```typescript
interface SessionState {
  sessions: Session[];
  currentId: string;
  searchQuery: string;
}
```

**Actions**:
- createSession(title?, id?): Session
- selectSession(id): void
- deleteSession(id): void
- updateTitle(id, title): void
- pinSession(id, pinned): void
- resetSession(id): void
- reorderSessions(): void

**Getters**:
- sortedSessions: Session[] (置顶优先，时间倒序)
- currentSession: Session | undefined
- pinnedSessions: Session[]
- filteredSessions: Session[] (根据 searchQuery)

#### 2.5.3 connection Store

**State**:
```typescript
interface ConnectionState {
  status: 'connected' | 'disconnected' | 'reconnecting' | 'error';
  reconnectCount: number;
  lastError: string | null;
  latency: number;  // ms
}
```

**Actions**:
- setStatus(status, error?): void
- incrementReconnect(): void
- resetReconnect(): void
- setLatency(ms): void

---

## 3. 非功能性需求

### 3.1 性能需求

**PERF-001: 初始加载**
- 首屏渲染 < 1s (CDN 环境)
- JS bundle 大小 < 200KB (gzip)

**PERF-002: 消息渲染**
- 100 条消息渲染 < 100ms
- 虚拟滚动支持 1000+ 消息
- 图片懒加载

**PERF-003: 响应时间**
- 输入响应 < 16ms (60fps)
- 消息发送 < 50ms (UI 反馈)

### 3.2 兼容性需求

**COMPAT-001: 浏览器**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**COMPAT-002: 移动端**
- iOS Safari 14+
- Chrome Android 90+
- 响应式布局适配

### 3.3 可访问性 (a11y)

**A11Y-001: 键盘导航**
- Tab 键可在元素间导航
- Enter 激活按钮
- ESC 关闭弹窗/菜单
- 方向键在列表中选择

**A11Y-002: 屏幕阅读器**
- 所有按钮有 aria-label
- 消息区域有 role="log"
- 状态变化有 aria-live

**A11Y-003: 对比度**
- 文字与背景对比度 ≥ 4.5:1
- 暗色主题同样满足

### 3.4 安全性

**SEC-001: XSS 防护**
- Markdown 渲染过滤危险标签 (script, iframe)
- 图片 URL 校验
- 代码高亮使用 textContent，不解析 HTML

**SEC-002: 内容安全**
- 支持 CSP (Content Security Policy)
- 图片支持跨域配置

---

## 4. 验收标准

### 4.1 功能验收

| ID | 测试项 | 步骤 | 期望结果 |
|----|--------|------|----------|
| AC-001 | 发送文本消息 | 1. 输入文字<br>2. 点击发送 | 消息显示在列表，AI 回复 |
| AC-002 | Markdown 渲染 | 发送 `## 标题` | 显示为 H2 标题 |
| AC-003 | 代码高亮 | 发送 ```js\nconst a = 1;\n``` | 显示带语法高亮的代码块 |
| AC-004 | 复制代码 | 点击代码块复制按钮 | 代码复制到剪贴板 |
| AC-005 | 上传图片 | 选择图片发送 | 图片显示，可预览 |
| AC-006 | 流式输出 | 发送长文本请求 | 逐字显示，光标闪烁 |
| AC-007 | 新建会话 | 点击 + 按钮 | 新会话创建，消息区清空 |
| AC-008 | 切换会话 | 点击左侧会话 | 显示对应历史消息 |
| AC-009 | 删除会话 | 右键删除会话 | 会话消失，切换到其他 |
| AC-010 | 主题切换 | 切换暗色模式 | 界面变为暗色 |
| AC-011 | 语言切换 | 切换到英文 | 全部文本变为英文 |
| AC-012 | 断线重连 | 断开网络再恢复 | 自动重连，恢复会话 |
| AC-013 | 消息队列 | 快速发送 3 条消息 | 排队发送，显示队列数 |

### 4.2 性能验收
- Lighthouse 性能分数 ≥ 90
- 内存占用稳定，无泄漏 (1 小时测试)
- 移动端 60fps 流畅

### 4.3 兼容性验收
- 目标浏览器无报错
- 响应式布局在各尺寸正常
- 触摸屏手势正常

---

## 5. 附录

### 5.1 文件结构
```
packages/vue/
├── src/
│   ├── components/          # Vue 组件
│   ├── composables/         # 组合式函数
│   ├── stores/              # Pinia Stores
│   ├── utils/               # 工具函数
│   ├── styles/              # 样式文件
│   ├── locales/             # i18n 文件
│   ├── types/               # TypeScript 类型
│   └── index.ts             # 入口
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### 5.2 依赖清单
- vue: ^3.4.0 (peer)
- pinia: ^2.1.0
- vue-i18n: ^9.8.0
- marked: ^11.0.0
- highlight.js: ^11.9.0
- @iconify/vue: ^1.1.0

### 5.3 术语表
- **Composition API**: Vue 3 组合式 API
- **Ref**: Vue 响应式引用
- **Store**: Pinia 状态管理单元
- **Composable**: 可复用的逻辑函数
