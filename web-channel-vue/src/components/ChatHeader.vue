<template>
  <header class="oc-chat-header">
    <button class="oc-chat-header-toggle" @click="emit('toggle-sidebar')">
      <Icon icon="ri:menu-line" />
    </button>
    <span class="oc-chat-header-title">
      {{ currentSession?.title ?? t('chat.newSession') }}
    </span>
    <button class="oc-chat-header-new" @click="emit('new-session')">
      <Icon icon="ri:add-line" />
    </button>
  </header>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import type { Session } from '../types/index.js';

defineProps<{
  currentSession: Session | undefined;
  t: (key: string) => string;
}>();

const emit = defineEmits<{
  'toggle-sidebar': [];
  'new-session': [];
}>();
</script>

<style scoped>
.oc-chat-header {
  display: flex;
  align-items: center;
  height: var(--header-height);
  padding: 0 18px;
  border-bottom: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--bg-primary) 70%, transparent);
  backdrop-filter: blur(8px);
}
.oc-chat-header-toggle,
.oc-chat-header-new {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: none;
  background: color-mix(in srgb, var(--bg-primary) 72%, transparent);
  color: var(--text-primary);
  cursor: pointer;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  transition: transform var(--transition-fast), background var(--transition-fast);
}
.oc-chat-header-toggle:hover,
.oc-chat-header-new:hover {
  background: var(--primary-soft);
  transform: translateY(-1px);
}
.oc-chat-header-title {
  flex: 1;
  margin: 0 14px;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: 0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
