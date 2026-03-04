<template>
  <div class="oc-chat-container" :class="{ dark: isDark }">
    <ChatHeader
      :current-session="currentSession"
      :t="t"
      @toggle-sidebar="showSidebar = !showSidebar"
      @new-session="handleNewSession"
    />
    <div class="oc-chat-body">
      <SessionList
        :visible="showSidebar"
        :sessions="sessionStore.sessions"
        :sorted-sessions="sessionStore.sortedSessions"
        :current-id="sessionStore.currentId"
        :width="260"
        :t="t"
        @update:visible="showSidebar = $event"
        @select="handleSessionSelect"
      />
      <div class="oc-chat-main">
        <MessageList
          ref="messageListRef"
          :messages="messages"
          :streaming="isStreaming"
          :streaming-message-id="currentStreamId ?? undefined"
          :loading="isStreaming"
          :t="t"
          @copy="handleCopy"
          @preview-image="handleImagePreview"
        />
        <div v-if="!isConnected" class="oc-connection-status">
          <span>{{ t('chat.disconnected') }}</span>
          <button @click="reconnect">{{ t('chat.reconnect') }}</button>
        </div>
        <div v-if="isStreaming" class="oc-runtime-banner">
          <span>{{ t('chat.think') }}</span>
          <button @click="stop">{{ t('chat.stop') }}</button>
        </div>
        <ChatInput
          v-model="inputMessage"
          :disabled="isStreaming"
          :queued-count="queue.length"
          :t="t"
          @send="handleSend"
          @command="handleCommand"
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
import { ref, computed, onMounted, watch } from 'vue';
import { useChatStore } from '../stores/chat.js';
import { useSessionStore } from '../stores/session.js';
import { useConnectionStore } from '../stores/connection.js';
import { useTheme } from '../composables/useTheme.js';
import { useI18n } from '../composables/useI18n.js';
import { useChat } from '../composables/useChat.js';
import ChatHeader from './ChatHeader.vue';
import SessionList from './SessionList.vue';
import MessageList from './MessageList.vue';
import ChatInput from './ChatInput.vue';
import ImagePreview from './ImagePreview.vue';

const props = withDefaults(
  defineProps<{
    gatewayUrl?: string;
    token?: string;
  }>(),
  { gatewayUrl: 'http://localhost:3010', token: '' }
);

const connectionStore = useConnectionStore();
const sessionStore = useSessionStore();
const chatStore = useChatStore();

watch(
  () => props.gatewayUrl,
  (url) => {
    connectionStore.setGatewayUrl(url);
  },
  { immediate: true },
);

watch(
  () => props.token,
  (token) => {
    connectionStore.setToken(token || '');
  },
  { immediate: true },
);

const { isDark } = useTheme();
const { t } = useI18n();
const {
  messages,
  isStreaming,
  isConnected,
  send,
  stop,
  reconnect,
  queue,
  currentStreamId,
} = useChat();

const showSidebar = ref(true);
const inputMessage = ref('');
const previewVisible = ref(false);
const previewImage = ref('');
const messageListRef = ref<InstanceType<typeof MessageList>>();

const currentSession = computed(() => sessionStore.currentSession);

function handleNewSession() {
  sessionStore.createSession();
}

function handleSessionSelect(id: string) {
  sessionStore.selectSession(id);
}

function handleSend(content: string) {
  send(content);
}

function handleCommand(cmd: string) {
  if (cmd === 'new') {
    sessionStore.createSession();
  } else if (cmd === 'clear') {
    chatStore.clearMessages();
  }
}

function handleCopy(_text: string) {}

function handleImagePreview(url: string) {
  previewImage.value = url;
  previewVisible.value = true;
}

onMounted(() => {
  if (!sessionStore.currentId && !sessionStore.sessions.length) {
    sessionStore.createSession();
  }
  if (window.innerWidth < 900) {
    showSidebar.value = false;
  }
});
</script>

<style scoped>
.oc-connection-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 8px 14px 0;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--bg-primary) 72%, transparent);
  color: var(--text-secondary);
  font-size: 13px;
}
.oc-connection-status button {
  height: 30px;
  padding: 0 12px;
  border: none;
  border-radius: 999px;
  background: var(--primary-color);
  color: white;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
}

.oc-runtime-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 10px 14px 0;
  padding: 9px 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-color) 34%, var(--border-color));
  background: color-mix(in srgb, var(--accent-color) 8%, var(--bg-primary));
  font-size: 13px;
}

.oc-runtime-banner button {
  height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent-color) 80%, #fff 20%);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
</style>
