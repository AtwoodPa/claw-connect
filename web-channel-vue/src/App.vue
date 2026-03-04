<template>
  <main class="oc-app-root">
    <SetupPanel
      v-if="!readyConfig"
      :initial="draft"
      :t="t"
      @save="handleSave"
    />

    <template v-else>
      <div class="oc-app-bar">
        <span>{{ readyConfig.gatewayUrl }}</span>
        <button @click="resetConfig">重新配置</button>
      </div>
      <ChatContainer :gateway-url="readyConfig.gatewayUrl" :token="readyConfig.token" />
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import ChatContainer from './components/ChatContainer.vue';
import SetupPanel from './components/SetupPanel.vue';
import type { SetupConfig } from './types/index.js';
import { useI18n } from './composables/useI18n.js';

const STORAGE_KEY = 'openclaw-web-channel:setup';

function readStoredConfig(): SetupConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as SetupConfig;
    if (!parsed.gatewayUrl) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

const { t } = useI18n();

const stored = readStoredConfig();
const draft = ref<SetupConfig>(
  stored ?? {
    gatewayUrl: 'http://localhost:3010',
    apiKey: '',
    token: '',
  },
);

const readyConfig = ref<SetupConfig | null>(stored);

function handleSave(next: SetupConfig) {
  readyConfig.value = next;
  draft.value = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function resetConfig() {
  readyConfig.value = null;
}
</script>

<style scoped>
.oc-app-root {
  min-height: 100vh;
}

.oc-app-bar {
  position: fixed;
  z-index: 20;
  right: 14px;
  top: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--bg-primary) 82%, transparent);
  backdrop-filter: blur(8px);
  box-shadow: var(--shadow-sm);
  font-size: 12px;
}

.oc-app-bar span {
  color: var(--text-secondary);
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oc-app-bar button {
  border: 0;
  border-radius: 999px;
  height: 28px;
  padding: 0 12px;
  background: var(--primary-color);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.oc-app-bar button:hover {
  background: var(--primary-hover);
}

@media (max-width: 680px) {
  .oc-app-bar {
    left: 12px;
    right: 12px;
    top: 10px;
    justify-content: space-between;
  }

  .oc-app-bar span {
    max-width: 160px;
  }
}
</style>
