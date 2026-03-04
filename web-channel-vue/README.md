# Web Channel Vue

`openclaw-web-channel` 的前端聊天界面，内置初始化配置页，可直接与 OpenClaw Agent 对话。

## 当前能力

- 初始化配置页（服务地址 / API Key / Token 自动获取）
- 多会话聊天（每个会话映射到独立 `sessionKey`）
- 流式输出、停止生成、历史回放
- Markdown + 代码高亮 + 代码块复制
- 快捷指令（`/model`、`/think`、`/new`、`/clear`）
- 主题适配（亮色 / 暗色 / 跟随系统）
- 移动端响应式布局

## 启动

```bash
cd web-channel-vue
npm install
npm run dev
```

默认地址：`http://localhost:5173`

## 构建

```bash
npm run build
```

## 接入流程

1. 启动 OpenClaw Gateway（并启用 `web-channel` 插件）。
2. 打开前端页面。
3. 在初始化页填写：
   - `Service URL`（例如 `http://localhost:3010`）
   - `API Key`（仅当后端要求）
   - Token（可点击“自动获取 Token”）
4. 点击“连接并进入聊天”。

## 目录

```
web-channel-vue/
├── src/
│   ├── App.vue                 # 初始化配置页 + 聊天容器切换
│   ├── main.ts
│   ├── components/
│   │   ├── SetupPanel.vue      # 初始化配置页面
│   │   └── ChatContainer.vue
│   ├── composables/
│   ├── stores/
│   ├── locales/
│   ├── styles/
│   ├── types/
│   └── utils/
├── index.html
├── vite.config.ts
└── package.json
```

## 相关

- 后端插件：[../openclaw-web-channel](../openclaw-web-channel/)
