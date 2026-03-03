# Web Channel Vue

配套 [openclaw-web-channel](../openclaw-web-channel/) 的 Vue 3 聊天界面组件库，开箱即用的 AI 对话 UI。

## 功能

- 流式输出（打字机效果）
- 多会话管理（新建、切换、删除、置顶、重置）
- Markdown 渲染 + 代码高亮
- 代码块一键复制
- 图片发送与预览
- 快捷指令（/model、/think、/new、/clear）
- 消息队列（发送中自动排队）
- 主题切换（亮色 / 暗色 / 跟随系统）
- 国际化（中/英）
- 自动重连（指数退避）

## 技术栈

- Vue 3.4+ (Composition API)
- TypeScript 5.3+
- Vite 5
- Pinia 2
- VueUse 10
- vue-i18n 9
- marked + highlight.js
- @iconify/vue

## 快速开始

### 安装

```bash
npm install @openclaw/web-channel-vue
# 或本地开发
cd web-channel-vue && npm install
```

### 使用

```typescript
// main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import OpenClawChat from '@openclaw/web-channel-vue'
import '@openclaw/web-channel-vue/dist/style.css'

const i18n = createI18n({
  locale: navigator.language.startsWith('zh') ? 'zh-CN' : 'en',
  fallbackLocale: 'en'
})

const app = createApp(App)
app.use(createPinia())
app.use(i18n)
app.use(OpenClawChat, {
  gatewayUrl: 'http://localhost:3000',
  wsOptions: {
    reconnect: true,
    maxReconnect: 5
  }
})
app.mount('#app')
```

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

const gatewayUrl = 'http://localhost:3000'
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

## 项目结构

```
web-channel-vue/
├── src/
│   ├── components/       # ChatContainer, MessageItem, ChatInput, SessionList...
│   ├── composables/      # useChat, useWebSocket, useSession, useTheme...
│   ├── stores/           # chat, session, settings, connection
│   ├── utils/            # markdown, format, commands, queue
│   ├── styles/           # variables.css, themes/
│   ├── locales/          # zh-CN.json, en.json
│   ├── types/
│   └── index.ts
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 主要组件

| 组件 | 说明 |
|------|------|
| ChatContainer | 主容器，整合聊天、会话、输入 |
| MessageList | 消息列表 |
| MessageItem | 单条消息（Markdown、代码块、长按菜单） |
| ChatInput | 输入框（自适应高度、图片、快捷指令） |
| SessionList | 会话侧边栏 |
| ImagePreview | 图片预览 |
| ContextMenu | 右键/长按菜单 |

## 配置

| 属性 | 类型 | 说明 |
|------|------|------|
| gatewayUrl | string | Web Channel 服务地址（如 `http://localhost:3000`） |
| token | string? | JWT 认证 token |
| wsOptions | object? | reconnect, maxReconnect 等 |

## 开发

```bash
npm install
npm run dev
```

## 相关

- 后端插件: [openclaw-web-channel](../openclaw-web-channel/)
- PRD: [docs/guide/PRD_Vue_Chat_UI.md](../docs/guide/PRD_Vue_Chat_UI.md)
