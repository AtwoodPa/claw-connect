<template>
  <aside
    v-if="visible"
    class="oc-session-list"
    :style="{ width: width + 'px' }"
  >
    <div class="oc-session-list-header">
      <span>{{ t('session.title') }}</span>
      <button class="oc-session-list-close" @click="emit('update:visible', false)">
        <Icon icon="ri:close-line" />
      </button>
    </div>
    <div class="oc-session-list-items">
      <SessionItem
        v-for="s in sortedSessions"
        :key="s.id"
        :session="s"
        :is-active="s.id === currentId"
        @select="emit('select', s.id)"
      />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import SessionItem from './SessionItem.vue';
import type { Session } from '../types/index.js';

defineProps<{
  visible: boolean;
  sessions: Session[];
  sortedSessions: Session[];
  currentId: string;
  width?: number;
  t: (key: string) => string;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  select: [id: string];
  delete: [id: string];
  reset: [id: string];
}>();
</script>

<style scoped>
.oc-session-list {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--bg-secondary) 78%, transparent);
  backdrop-filter: blur(7px);
}
.oc-session-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-secondary);
}
.oc-session-list-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--bg-primary) 75%, transparent);
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 999px;
  transition: all var(--transition-fast);
}
.oc-session-list-close:hover {
  background: var(--primary-soft);
  color: var(--primary-color);
}
.oc-session-list-items {
  flex: 1;
  overflow-y: auto;
  padding: 8px 10px 12px;
}

@media (max-width: 900px) {
  .oc-session-list {
    position: absolute;
    z-index: 9;
    inset: 0 auto 0 0;
    box-shadow: var(--shadow-md);
  }
}
</style>
