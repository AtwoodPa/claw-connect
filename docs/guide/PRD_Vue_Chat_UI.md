# PRD: OpenClaw Web Channel Vue Chat UI

## 1. 项目概述

### 1.1 目标
为 `openclaw-web-channel` 插件开发配套的 Vue 3 聊天界面组件库，提供开箱即用的 AI 对话界面，支持流式输出、多会话管理、富媒体消息等完整功能。

### 1.2 技术栈
- **Framework**: Vue 3.4+ (Composition API)
- **Language**: TypeScript 5.3+
- **Build**: Vite 5
- **State**: Pinia 2
- **Utils**: VueUse 10
- **Markdown**: marked + highlight.js
- **i18n**: vue-i18n 9
- **Icons**: @iconify/vue
- **Components**: Headless UI (浮动菜单、对话框)

### 1.3 包结构
```
@openclaw/web-channel-vue/
├── dist/                      # 编译输出
├── src/
│   ├── components/            # UI 组件
│   │   ├── ChatContainer.vue  # 主容器
│   │   ├── ChatHeader.vue     # 顶部栏
│   │   ├── MessageList.vue    # 消息列表
│   │   ├── MessageItem.vue    # 单条消息
│   │   ├── ChatInput.vue      # 输入框
│   │   ├── SessionList.vue    # 会话侧边栏
│   │   ├── SessionItem.vue    # 会话项
│   │   ├── ImagePreview.vue   # 图片预览
│   │   ├── CodeBlock.vue      # 代码块组件
│   │   ├── ContextMenu.vue    # 长按菜单
│   │   └── QuickCommands.vue  # 快捷指令面板
│   │
│   ├── composables/           # 组合式函数
│   │   ├── useChat.ts         # 聊天核心逻辑
│   │   ├── useWebSocket.ts    # WebSocket 管理
│   │   ├── useSession.ts      # 会话管理
│   │   ├── useTheme.ts        # 主题切换
│   │   ├── useI18n.ts         # 国际化
│   │   ├── useImageUpload.ts  # 图片上传
│   │   └── useAutoScroll.ts   # 自动滚动控制
│   │
│   ├── stores/                # Pinia Stores
│   │   ├── chat.ts            # 聊天状态
│   │   ├── session.ts         # 会话状态
│   │   ├── settings.ts        # 设置状态
│   │   └── connection.ts      # 连接状态
│   │
│   ├── utils/                 # 工具函数
│   │   ├── markdown.ts        # Markdown 渲染
│   │   ├── format.ts          # 日期/文本格式化
│   │   ├── commands.ts        # 快捷指令解析
│   │   └── queue.ts           # 消息队列
│   │
│   ├── styles/                # 样式
│   │   ├── variables.css      # CSS 变量
│   │   ├── themes/            # 主题文件
│   │   │   ├── light.css
│   │   │   └── dark.css
│   │   └── index.css          # 入口样式
│   │
│   ├── locales/               # i18n 文件
│   │   ├── en.json
│   │   ├── zh-CN.json
│   │   └── index.ts
│   │
│   ├── types/                 # TypeScript 类型
│   │   └── index.ts
│   │
│   └── index.ts               # 库入口
│
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## 2. 组件详细设计

### 2.1 ChatContainer.vue (主容器)
```vue
<template>
  <div class="chat-container" :class="{ 'dark': isDark }">
    <ChatHeader 
      :current-session="currentSession"
      @toggle-sidebar="showSidebar = !showSidebar"
      @new-session="handleNewSession"
    />

    <div class="chat-body">
      <SessionList
        v-model:visible="showSidebar"
        :sessions="sessions"
        :current-id="currentSessionId"
        @select="handleSessionSelect"
        @delete="handleSessionDelete"
        @reset="handleSessionReset"
      />

      <div class="chat-main">
        <MessageList
          ref="messageListRef"
          :messages="currentMessages"
          :streaming="isStreaming"
          :loading="isLoading"
          @scroll-top="loadMoreHistory"
          @copy="handleCopy"
          @preview-image="handleImagePreview"
        />

        <div v-if="!isConnected" class="connection-status">
          <span class="disconnected">{{ t('chat.disconnected') }}</span>
          <button @click="reconnect">{{ t('chat.reconnect') }}</button>
        </div>

        <ChatInput
          v-model="inputMessage"
          :disabled="isLoading && !isStreaming"
          :uploading="isUploading"
          :queued-count="messageQueue.length"
          @send="handleSend"
          @upload="handleImageSelect"
          @command="handleCommand"
          @stop="handleStop"
        />
      </div>
    </div>

    <ImagePreview
      v-model:visible="previewVisible"
      :src="previewImage"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useChatStore } from '../stores/chat'
import { useSessionStore } from '../stores/session'
import { useConnectionStore } from '../stores/connection'
import { useTheme } from '../composables/useTheme'
import { useI18n } from '../composables/useI18n'

// ... 逻辑实现
</script>
```

### 2.2 MessageItem.vue (消息项 - 包含长按菜单、代码复制)
```vue
<template>
  <div 
    class="message-item" 
    :class="[message.role, { 'streaming': isStreaming }]"
    @contextmenu.prevent="showContextMenu"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <div class="message-avatar">
      <img v-if="message.role === 'assistant'" src="/ai-avatar.png" />
      <img v-else src="/user-avatar.png" />
    </div>

    <div class="message-content">
      <div class="message-header">
        <span class="role-name">{{ roleName }}</span>
        <span class="message-time">{{ formatTime(message.timestamp) }}</span>
      </div>

      <div class="message-body">
        <!-- 图片消息 -->
        <div v-if="message.images?.length" class="image-grid">
          <img 
            v-for="(img, idx) in message.images" 
            :key="idx"
            :src="img.thumbnail || img.url"
            @click="$emit('preview', img.url)"
            class="message-image"
          />
        </div>

        <!-- 文本消息 -->
        <div 
          v-if="message.content" 
          class="message-text"
          v-html="renderedContent"
        />

        <!-- 打字机光标 -->
        <span v-if="isStreaming" class="cursor">▋</span>
      </div>

      <!-- 操作按钮 -->
      <div class="message-actions">
        <button v-if="message.role === 'assistant'" @click="$emit('regenerate')">
          <Icon icon="ri:refresh-line" />
        </button>
        <button @click="handleCopy">
          <Icon icon="ri:file-copy-line" />
        </button>
      </div>
    </div>

    <!-- 长按/右键菜单 -->
    <ContextMenu
      v-model:visible="menuVisible"
      :x="menuX"
      :y="menuY"
      :items="contextMenuItems"
      @select="handleMenuSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { renderMarkdown } from '../utils/markdown'
import ContextMenu from './ContextMenu.vue'

const props = defineProps<{
  message: Message
  isStreaming?: boolean
}>()

const emit = defineEmits<{
  copy: [text: string]
  preview: [url: string]
  regenerate: []
}>()

// Markdown 渲染（含代码高亮）
const renderedContent = computed(() => {
  return renderMarkdown(props.message.content, {
    highlight: true,
    copyButton: true
  })
})

// 长按菜单逻辑
const menuVisible = ref(false)
const menuX = ref(0)
const menuY = ref(0)
let touchTimer: number | null = null

const contextMenuItems = [
  { key: 'copy', label: t('menu.copy'), icon: 'ri:file-copy-line' },
  { key: 'copy-code', label: t('menu.copyCode'), icon: 'ri:code-box-line' },
  { key: 'quote', label: t('menu.quote'), icon: 'ri:quote-text' },
  { key: 'delete', label: t('menu.delete'), icon: 'ri:delete-bin-line', danger: true }
]

function showContextMenu(e: MouseEvent) {
  menuX.value = e.clientX
  menuY.value = e.clientY
  menuVisible.value = true
}

function handleTouchStart(e: TouchEvent) {
  touchTimer = window.setTimeout(() => {
    const touch = e.touches[0]
    menuX.value = touch.clientX
    menuY.value = touch.clientY
    menuVisible.value = true
  }, 500) // 500ms 长按
}

function handleTouchEnd() {
  if (touchTimer) {
    clearTimeout(touchTimer)
    touchTimer = null
  }
}

function handleMenuSelect(key: string) {
  switch (key) {
    case 'copy':
      navigator.clipboard.writeText(props.message.content)
      break
    case 'copy-code':
      // 提取所有代码块
      const codes = extractCodeBlocks(props.message.content)
      navigator.clipboard.writeText(codes.join('\n'))
      break
    case 'delete':
      // 调用 store 删除
      break
  }
  menuVisible.value = false
}
</script>

<style scoped>
.message-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  position: relative;
}

.message-item.user {
  flex-direction: row-reverse;
}

.cursor {
  display: inline-block;
  width: 8px;
  height: 1.2em;
  background: currentColor;
  margin-left: 2px;
  animation: blink 1s step-end infinite;
  vertical-align: text-bottom;
}

@keyframes blink {
  50% { opacity: 0; }
}

/* 代码块复制按钮 */
:deep(pre) {
  position: relative;
}

:deep(.code-copy-btn) {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

:deep(pre:hover .code-copy-btn) {
  opacity: 1;
}
</style>
```

### 2.3 ChatInput.vue (输入框 - 自适应高度、快捷指令、图片上传)
```vue
<template>
  <div class="chat-input-container">
    <!-- 快捷指令面板 -->
    <QuickCommands
      v-if="showCommands"
      :query="commandQuery"
      @select="handleCommandSelect"
    />

    <!-- 图片预览（发送前） -->
    <div v-if="selectedImages.length" class="image-preview-bar">
      <div v-for="(img, idx) in selectedImages" :key="idx" class="preview-item">
        <img :src="img.preview" />
        <button class="remove-btn" @click="removeImage(idx)">
          <Icon icon="ri:close-line" />
        </button>
      </div>
    </div>

    <div class="input-wrapper">
      <button class="attach-btn" @click="triggerFileInput">
        <Icon icon="ri:attachment-2" />
        <input 
          ref="fileInput" 
          type="file" 
          accept="image/*" 
          multiple 
          hidden
          @change="handleFileSelect"
        />
      </button>

      <div class="textarea-wrapper">
        <textarea
          ref="textareaRef"
          v-model="text"
          :placeholder="placeholder"
          :disabled="disabled"
          rows="1"
          @keydown.enter.prevent="handleEnter"
          @input="handleInput"
          @compositionstart="isComposing = true"
          @compositionend="isComposing = false"
        />

        <!-- 发送中遮罩 -->
        <div v-if="isLoading" class="loading-overlay">
          <span>{{ t('input.thinking') }}</span>
          <button class="stop-btn" @click="$emit('stop')">
            <Icon icon="ri:stop-circle-fill" />
            {{ t('input.stop') }}
          </button>
        </div>
      </div>

      <button 
        class="send-btn" 
        :disabled="!canSend || disabled"
        @click="handleSend"
      >
        <Icon v-if="isLoading" icon="ri:stop-fill" />
        <Icon v-else icon="ri:send-plane-fill" />
      </button>
    </div>

    <!-- 消息队列提示 -->
    <div v-if="queuedCount > 0" class="queue-hint">
      {{ t('input.queued', { count: queuedCount }) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import QuickCommands from './QuickCommands.vue'

const props = defineProps<{
  modelValue: string
  disabled?: boolean
  uploading?: boolean
  isLoading?: boolean
  queuedCount?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  send: [content: string, images: File[]]
  upload: [files: FileList]
  command: [command: string, args: string]
  stop: []
}>()

const text = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const textareaRef = ref<HTMLTextAreaElement>()
const isComposing = ref(false)
const selectedImages = ref<{ file: File; preview: string }[]>([])
const showCommands = ref(false)
const commandQuery = ref('')

// 自适应高度
function handleInput() {
  const el = textareaRef.value
  if (!el) return

  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 200) + 'px'

  // 检测快捷指令
  const val = el.value
  const match = val.match(/\/(\w*)/)
  if (match && val.endsWith(match[0])) {
    showCommands.value = true
    commandQuery.value = match[1]
  } else {
    showCommands.value = false
  }
}

// 快捷指令处理
const commands = [
  { key: 'model', label: 'Switch Model', description: '/model [name]', handler: handleModelCommand },
  { key: 'think', label: 'Deep Think', description: '/think [question]', handler: handleThinkCommand },
  { key: 'new', label: 'New Session', description: '/new', handler: handleNewCommand },
  { key: 'clear', label: 'Clear History', description: '/clear', handler: handleClearCommand }
]

function handleCommandSelect(cmd: typeof commands[0]) {
  const currentText = text.value
  const newText = currentText.replace(/\/\w*/, '')
  text.value = newText
  showCommands.value = false

  if (cmd.key === 'new') {
    emit('command', 'new', '')
  } else if (cmd.key === 'clear') {
    emit('command', 'clear', '')
  } else {
    // 保留命令在输入框等待参数
    text.value = `/${cmd.key} `
  }
}

function handleEnter(e: KeyboardEvent) {
  if (e.shiftKey) {
    // Shift+Enter 换行
    return
  }
  if (isComposing.value) {
    // 输入法组合中不发送
    return
  }
  handleSend()
}

function handleSend() {
  if (!canSend.value) return

  const images = selectedImages.value.map(img => img.file)
  emit('send', text.value, images)

  // 清空
  text.value = ''
  selectedImages.value = []
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
  }
}

// 图片处理
function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileSelect(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files) return

  Array.from(files).forEach(file => {
    const reader = new FileReader()
    reader.onload = (e) => {
      selectedImages.value.push({
        file,
        preview: e.target?.result as string
      })
    }
    reader.readAsDataURL(file)
  })
}
</script>

<style scoped>
.textarea-wrapper {
  position: relative;
  flex: 1;
}

textarea {
  width: 100%;
  min-height: 44px;
  max-height: 200px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  resize: none;
  outline: none;
  font-size: 14px;
  line-height: 1.5;
  transition: border-color 0.2s;
}

textarea:focus {
  border-color: var(--primary-color);
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border-radius: 8px;
}

.stop-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.image-preview-bar {
  display: flex;
  gap: 8px;
  padding: 8px;
  overflow-x: auto;
}

.preview-item {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
}

.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  background: rgba(0,0,0,0.5);
  color: white;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
</style>
```

## 3. Composables 设计

### 3.1 useChat.ts (聊天核心)
```typescript
import { ref, computed } from 'vue'
import { useChatStore } from '../stores/chat'
import { useSessionStore } from '../stores/session'
import { useWebSocket } from './useWebSocket'
import { useMessageQueue } from './useMessageQueue'

export function useChat() {
  const chatStore = useChatStore()
  const sessionStore = useSessionStore()
  const { ws, isConnected, sendMessage, stopGeneration } = useWebSocket()
  const { queue, addToQueue, processQueue } = useMessageQueue()

  const isStreaming = ref(false)
  const currentStreamId = ref<string | null>(null)

  // 发送消息（支持队列）
  async function send(content: string, images?: File[]) {
    if (isStreaming.value) {
      // 如果正在生成，加入队列
      addToQueue({ content, images })
      return
    }

    await doSend(content, images)
  }

  async function doSend(content: string, images?: File[]) {
    // 上传图片
    let imageUrls: string[] = []
    if (images?.length) {
      imageUrls = await uploadImages(images)
    }

    // 添加用户消息到本地
    const userMessage = {
      id: generateId(),
      role: 'user',
      content,
      images: imageUrls,
      timestamp: Date.now()
    }
    chatStore.addMessage(userMessage)

    // 发送到服务器
    isStreaming.value = true
    currentStreamId.value = generateId()

    sendMessage({
      type: 'chat',
      payload: {
        content,
        images: imageUrls,
        sessionId: sessionStore.currentId,
        messageId: currentStreamId.value
      }
    })
  }

  // 接收流式消息
  function handleStreamChunk(chunk: StreamChunk) {
    if (!currentStreamId.value) return

    // 查找或创建 assistant 消息
    let msg = chatStore.getMessage(currentStreamId.value)
    if (!msg) {
      msg = {
        id: currentStreamId.value,
        role: 'assistant',
        content: '',
        timestamp: Date.now()
      }
      chatStore.addMessage(msg)
    }

    // 追加内容（打字机效果）
    msg.content += chunk.content

    // 滚动到底部
    scrollToBottom()
  }

  function handleStreamEnd() {
    isStreaming.value = false
    currentStreamId.value = null

    // 处理队列中下一条
    const next = queue.value.shift()
    if (next) {
      doSend(next.content, next.images)
    }
  }

  // 停止生成
  function stop() {
    if (currentStreamId.value) {
      stopGeneration(currentStreamId.value)
      isStreaming.value = false
    }
  }

  return {
    messages: computed(() => chatStore.currentMessages),
    isStreaming,
    isConnected,
    send,
    stop,
    queue
  }
}
```

### 3.2 useWebSocket.ts (WebSocket 管理 + 自动重连)
```typescript
import { ref, onMounted, onUnmounted } from 'vue'
import { useConnectionStore } from '../stores/connection'

export function useWebSocket() {
  const ws = ref<WebSocket | null>(null)
  const isConnected = ref(false)
  const reconnectCount = ref(0)
  const connectionStore = useConnectionStore()

  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null

  const MAX_RECONNECT = 5
  const RECONNECT_DELAY = 3000

  function connect() {
    const wsUrl = `${connectionStore.gatewayUrl.replace('http', 'ws')}/ws`

    ws.value = new WebSocket(wsUrl)

    ws.value.onopen = () => {
      isConnected.value = true
      reconnectCount.value = 0
      connectionStore.setStatus('connected')

      // 认证
      if (connectionStore.token) {
        ws.value?.send(JSON.stringify({
          type: 'auth',
          payload: { token: connectionStore.token }
        }))
      }

      // 启动心跳
      startHeartbeat()
    }

    ws.value.onmessage = (event) => {
      const data = JSON.parse(event.data)
      handleMessage(data)
    }

    ws.value.onclose = () => {
      isConnected.value = false
      stopHeartbeat()

      if (reconnectCount.value < MAX_RECONNECT) {
        scheduleReconnect()
      } else {
        connectionStore.setStatus('failed')
      }
    }

    ws.value.onerror = (error) => {
      console.error('WebSocket error:', error)
      connectionStore.setStatus('error')
    }
  }

  function scheduleReconnect() {
    reconnectCount.value++
    connectionStore.setStatus('reconnecting', reconnectCount.value)

    reconnectTimer = setTimeout(() => {
      connect()
    }, RECONNECT_DELAY * reconnectCount.value) // 指数退避
  }

  function reconnect() {
    reconnectCount.value = 0
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    connect()
  }

  function startHeartbeat() {
    heartbeatTimer = setInterval(() => {
      ws.value?.send(JSON.stringify({ type: 'ping' }))
    }, 30000) // 30s
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  function sendMessage(data: any) {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(data))
    }
  }

  function stopGeneration(messageId: string) {
    sendMessage({
      type: 'stop',
      payload: { messageId }
    })
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    stopHeartbeat()
    ws.value?.close()
  })

  return {
    ws,
    isConnected,
    reconnectCount,
    connect,
    reconnect,
    sendMessage,
    stopGeneration
  }
}
```

### 3.3 useTheme.ts (主题切换)
```typescript
import { ref, watch, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings'

type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const settings = useSettingsStore()
  const currentTheme = ref<Theme>(settings.theme)
  const isDark = ref(false)

  function applyTheme(theme: Theme) {
    const root = document.documentElement

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      isDark.value = prefersDark
      root.classList.toggle('dark', prefersDark)
    } else {
      isDark.value = theme === 'dark'
      root.classList.toggle('dark', isDark.value)
    }
  }

  function setTheme(theme: Theme) {
    currentTheme.value = theme
    settings.setTheme(theme)
    applyTheme(theme)
  }

  // 监听系统主题变化
  onMounted(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', (e) => {
      if (currentTheme.value === 'system') {
        applyTheme('system')
      }
    })

    applyTheme(currentTheme.value)
  })

  watch(() => settings.theme, (newTheme) => {
    currentTheme.value = newTheme
    applyTheme(newTheme)
  })

  return {
    theme: currentTheme,
    isDark,
    setTheme
  }
}
```

## 4. Stores (Pinia)

### 4.1 chat.ts (聊天状态)
```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  images?: string[]
  timestamp: number
  isError?: boolean
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Map<string, Message[]>>(new Map()) // sessionId -> messages
  const currentSessionId = ref<string>('')

  const currentMessages = computed(() => {
    return messages.value.get(currentSessionId.value) || []
  })

  function setSessionId(id: string) {
    currentSessionId.value = id
    if (!messages.value.has(id)) {
      messages.value.set(id, [])
    }
  }

  function addMessage(message: Message) {
    const list = messages.value.get(currentSessionId.value) || []
    list.push(message)
    messages.value.set(currentSessionId.value, list)
  }

  function updateMessage(id: string, updates: Partial<Message>) {
    const list = messages.value.get(currentSessionId.value) || []
    const idx = list.findIndex(m => m.id === id)
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates }
    }
  }

  function deleteMessage(id: string) {
    const list = messages.value.get(currentSessionId.value) || []
    const idx = list.findIndex(m => m.id === id)
    if (idx !== -1) {
      list.splice(idx, 1)
    }
  }

  function clearMessages(sessionId?: string) {
    const id = sessionId || currentSessionId.value
    messages.value.set(id, [])
  }

  function loadHistory(sessionId: string, history: Message[]) {
    messages.value.set(sessionId, history)
  }

  return {
    messages,
    currentSessionId,
    currentMessages,
    setSessionId,
    addMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
    loadHistory
  }
})
```

### 4.2 session.ts (会话管理)
```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateId } from '../utils/format'

export interface Session {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messageCount: number
  model?: string
  isPinned?: boolean
}

export const useSessionStore = defineStore('session', () => {
  const sessions = ref<Session[]>([])
  const currentId = ref<string>('')

  const currentSession = computed(() => 
    sessions.value.find(s => s.id === currentId.value)
  )

  const sortedSessions = computed(() => {
    return [...sessions.value].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return b.updatedAt - a.updatedAt
    })
  })

  function createSession(title?: string) {
    const session: Session = {
      id: generateId(),
      title: title || `New Chat ${sessions.value.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0
    }
    sessions.value.unshift(session)
    currentId.value = session.id
    return session
  }

  function selectSession(id: string) {
    currentId.value = id
  }

  function deleteSession(id: string) {
    const idx = sessions.value.findIndex(s => s.id === id)
    if (idx !== -1) {
      sessions.value.splice(idx, 1)
      if (currentId.value === id) {
        currentId.value = sessions.value[0]?.id || ''
      }
    }
  }

  function resetSession(id: string) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      session.messageCount = 0
      session.updatedAt = Date.now()
    }
  }

  function updateTitle(id: string, title: string) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      session.title = title
    }
  }

  function pinSession(id: string, pinned: boolean) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      session.isPinned = pinned
    }
  }

  return {
    sessions,
    currentId,
    currentSession,
    sortedSessions,
    createSession,
    selectSession,
    deleteSession,
    resetSession,
    updateTitle,
    pinSession
  }
})
```

## 5. 工具函数

### 5.1 markdown.ts (Markdown 渲染)
```typescript
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'

// 配置 marked
marked.use({
  renderer: {
    code(code: string, language?: string) {
      const validLang = language && hljs.getLanguage(language) ? language : 'plaintext'
      const highlighted = hljs.highlight(code, { language: validLang }).value

      return `
        <div class="code-block-wrapper">
          <div class="code-header">
            <span class="code-lang">${validLang}</span>
            <button class="code-copy-btn" onclick="copyCode(this)" data-code="${encodeURIComponent(code)}">
              Copy
            </button>
          </div>
          <pre><code class="hljs language-${validLang}">${highlighted}</code></pre>
        </div>
      `
    }
  }
})

export function renderMarkdown(content: string, options?: { highlight?: boolean }) {
  if (!content) return ''
  return marked.parse(content, { async: false })
}

// 复制代码函数（挂载到 window）
;(window as any).copyCode = function(btn: HTMLButtonElement) {
  const code = decodeURIComponent(btn.dataset.code || '')
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = 'Copied!'
    setTimeout(() => btn.textContent = 'Copy', 2000)
  })
}
```

### 5.2 queue.ts (消息队列)
```typescript
import { ref } from 'vue'

interface QueuedMessage {
  id: string
  content: string
  images?: File[]
  timestamp: number
}

export function useMessageQueue() {
  const queue = ref<QueuedMessage[]>([])

  function addToQueue(msg: Omit<QueuedMessage, 'id' | 'timestamp'>) {
    queue.value.push({
      ...msg,
      id: generateId(),
      timestamp: Date.now()
    })
  }

  function getNext() {
    return queue.value.shift()
  }

  function clear() {
    queue.value = []
  }

  return {
    queue,
    addToQueue,
    getNext,
    clear
  }
}
```

## 6. 主题样式

### 6.1 variables.css (CSS 变量)
```css
:root {
  /* 颜色 */
  --primary-color: #3b82f6;
  --primary-hover: #2563eb;
  --bg-primary: #ffffff;
  --bg-secondary: #f3f4f6;
  --bg-tertiary: #e5e7eb;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --border-color: #e5e7eb;
  --message-user-bg: #3b82f6;
  --message-user-text: #ffffff;
  --message-assistant-bg: #f3f4f6;
  --message-assistant-text: #111827;

  /* 尺寸 */
  --sidebar-width: 260px;
  --header-height: 60px;
  --input-height: auto;

  /* 动画 */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.3s ease;
}

:root.dark {
  --bg-primary: #111827;
  --bg-secondary: #1f2937;
  --bg-tertiary: #374151;
  --text-primary: #f9fafb;
  --text-secondary: #9ca3af;
  --border-color: #374151;
  --message-assistant-bg: #1f2937;
  --message-assistant-text: #f9fafb;
}
```

## 7. i18n 配置

### 7.1 locales/zh-CN.json
```json
{
  "chat": {
    "newSession": "新建会话",
    "send": "发送",
    "think": "思考中...",
    "stop": "停止生成",
    "disconnected": "连接已断开",
    "reconnect": "重新连接",
    "reconnecting": "正在重连 ({count})...",
    "placeholder": "输入消息...",
    "queued": "待发送消息: {count}"
  },
  "session": {
    "title": "会话列表",
    "empty": "暂无会话",
    "delete": "删除会话",
    "reset": "清空历史",
    "pin": "置顶",
    "unpin": "取消置顶",
    "confirmDelete": "确定要删除这个会话吗？"
  },
  "menu": {
    "copy": "复制文本",
    "copyCode": "复制代码块",
    "quote": "引用",
    "delete": "删除"
  },
  "commands": {
    "model": "切换模型",
    "think": "深度思考",
    "new": "新建会话",
    "clear": "清空历史"
  }
}
```

## 8. Cursor 生成指令

### 8.1 完整生成提示词
```
基于以下需求生成完整的 Vue 3 + TypeScript 聊天组件库：

项目: @openclaw/web-channel-vue
技术栈: Vue 3.4 + Vite + Pinia + VueUse + marked + highlight.js + vue-i18n

需要生成的文件:
1. package.json - 配置为 library 模式，支持按需引入
2. vite.config.ts - 配置 library build
3. src/index.ts - 库入口，导出所有组件和 composables
4. src/components/ChatContainer.vue - 主容器，整合所有功能
5. src/components/MessageItem.vue - 消息项（支持 Markdown、代码高亮、长按菜单）
6. src/components/ChatInput.vue - 输入框（自适应高度、快捷指令、图片上传）
7. src/components/SessionList.vue - 会话侧边栏（切换、新建、删除、重置）
8. src/composables/useChat.ts - 聊天核心逻辑（流式输出、队列管理）
9. src/composables/useWebSocket.ts - WebSocket + 自动重连（指数退避）
10. src/composables/useTheme.ts - 主题切换（light/dark/system）
11. src/stores/chat.ts - Pinia store 管理消息
12. src/stores/session.ts - Pinia store 管理会话
13. src/utils/markdown.ts - Markdown 渲染 + 代码复制按钮
14. src/locales/zh-CN.json + en.json - i18n 文件
15. src/styles/ - 主题样式文件

功能要求:
- 流式输出打字机效果（光标闪烁）
- 代码块一键复制（hover 显示按钮）
- 消息长按菜单（移动端触摸 500ms）
- 自动重连（最多 5 次，指数退避）
- 消息队列（发送中时排队）
- 图片上传预览（发送前 + 大图预览）
- 快捷指令 /model /think /new /clear
- 会话管理（增删改查、置顶、重置）
- 主题切换（亮色/暗色/跟随系统）
- i18n（中英文自动检测）
- 响应式布局（移动端适配）

代码规范:
- 使用 <script setup lang="ts">
- 严格 TypeScript 类型
- 使用 CSS 变量实现主题
- 组件 props/emits 必须定义类型
- 使用 VueUse 的 useStorage/useDark 等工具

开始生成所有文件。
```

## 9. 使用示例

### 9.1 安装与配置
```bash
npm install @openclaw/web-channel-vue
```

```typescript
// main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import OpenClawChat from '@openclaw/web-channel-vue'
import '@openclaw/web-channel-vue/dist/style.css'

import App from './App.vue'

const i18n = createI18n({
  locale: navigator.language,
  fallbackLocale: 'en'
})

const app = createApp(App)
app.use(createPinia())
app.use(i18n)
app.use(OpenClawChat, {
  gatewayUrl: 'http://localhost:3010',
  wsOptions: {
    reconnect: true,
    maxReconnect: 5
  }
})
app.mount('#app')
```

### 9.2 在页面中使用
```vue
<template>
  <div class="chat-page">
    <ChatContainer 
      :gateway-url="gatewayUrl"
      :token="authToken"
      @error="handleError"
    />
  </div>
</template>

<script setup lang="ts">
import { ChatContainer } from '@openclaw/web-channel-vue'

const gatewayUrl = 'http://localhost:3010'
const authToken = localStorage.getItem('token')

function handleError(error: Error) {
  console.error('Chat error:', error)
}
</script>

<style>
.chat-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
```

## 10. 功能清单对照表

| 功能 | 实现位置 | 状态 |
|------|---------|------|
| 流式聊天 | useChat.ts + MessageItem.vue 光标 | ✅ |
| Markdown 渲染 | utils/markdown.ts | ✅ |
| 代码高亮 | highlight.js | ✅ |
| 代码块复制按钮 | markdown.ts renderer | ✅ |
| 聊天历史 | stores/chat.ts | ✅ |
| 中止生成 | useWebSocket.ts stopGeneration | ✅ |
| 会话列表 | SessionList.vue + stores/session.ts | ✅ |
| 会话切换 | session.ts selectSession | ✅ |
| 会话新建 | session.ts createSession | ✅ |
| 会话删除 | SessionList.vue + confirm dialog | ✅ |
| 会话重置 | session.ts resetSession | ✅ |
| 图片发送 | ChatInput.vue file select | ✅ |
| 图片预览 | ImagePreview.vue | ✅ |
| 快捷指令 | ChatInput.vue QuickCommands | ✅ |
| /model | commands.ts | ✅ |
| /think | commands.ts | ✅ |
| /new | commands.ts | ✅ |
| 主题切换 | useTheme.ts | ✅ |
| 亮色/暗色/跟随 | CSS variables + matchMedia | ✅ |
| i18n | vue-i18n | ✅ |
| 自动检测 | navigator.language | ✅ |
| 自动重连 | useWebSocket.ts | ✅ |
| 手动重连 | connection status bar | ✅ |
| 消息队列 | useMessageQueue.ts | ✅ |
| 消息长按菜单 | MessageItem.vue + ContextMenu.vue | ✅ |
| 复制文本 | navigator.clipboard | ✅ |
| 复制代码块 | extractCodeBlocks | ✅ |
| 消息时间戳 | MessageItem.vue formatTime | ✅ |
| 滚动到底部 | MessageList.vue auto scroll | ✅ |
| 输入框自适应 | ChatInput.vue handleInput | ✅ |

---

**文档版本**: 1.0  
**适用**: @openclaw/web-channel-vue  
**最后更新**: 2026-03-03
