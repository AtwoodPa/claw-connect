import type { App } from 'vue';
import ChatContainer from './components/ChatContainer.vue';
import { useChat } from './composables/useChat.js';
import { useChatStore } from './stores/chat.js';
import { useConnectionStore } from './stores/connection.js';
import { useSessionStore } from './stores/session.js';
import { useTheme } from './composables/useTheme.js';
import { useWebSocket } from './composables/useWebSocket.js';
import './styles/base.css';

export { ChatContainer, useChat, useChatStore, useConnectionStore, useSessionStore, useTheme, useWebSocket };

export default {
  install(app: App) {
    app.component('ChatContainer', ChatContainer);
  },
};
