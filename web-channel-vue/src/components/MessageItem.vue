<template>
  <div
    class="oc-message-item"
    :class="[message.role, { 'oc-message-item--streaming': isStreaming }]"
    @contextmenu.prevent="showContextMenu"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <div class="oc-message-avatar" />
    <div class="oc-message-content">
      <div class="oc-message-header">
        <span class="oc-message-role">{{ roleName }}</span>
        <span class="oc-message-time">{{ formatTime(message.timestamp) }}</span>
      </div>
      <div class="oc-message-body">
        <div v-if="message.images?.length" class="oc-message-images">
          <img
            v-for="(img, idx) in message.images"
            :key="idx"
            :src="typeof img === 'string' ? img : (img as { url?: string })?.url"
            class="oc-message-img"
            @click="emit('preview', typeof img === 'string' ? img : (img as { url?: string })?.url ?? '')"
          />
        </div>
        <div
          v-if="message.content"
          class="oc-message-text"
          v-html="renderedContent"
        />
        <span v-if="isStreaming" class="oc-message-cursor">▋</span>
      </div>
      <div class="oc-message-actions">
        <button v-if="message.role === 'assistant'" @click="emit('regenerate')">
          <Icon icon="ri:refresh-line" />
        </button>
        <button @click="handleCopy">
          <Icon icon="ri:file-copy-line" />
        </button>
      </div>
    </div>
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
import { ref, computed } from 'vue';
import { Icon } from '@iconify/vue';
import { renderMarkdown } from '../utils/markdown.js';
import { formatTime } from '../utils/format.js';
import { extractCodeBlocks } from '../utils/commands.js';
import ContextMenu from './ContextMenu.vue';
import type { Message } from '../types/index.js';
import type { ContextMenuItem } from './ContextMenu.vue';

const props = defineProps<{
  message: Message;
  isStreaming?: boolean;
  t: (key: string) => string;
}>();

const emit = defineEmits<{
  copy: [text: string];
  preview: [url: string];
  regenerate: [];
}>();

const roleName = computed(() => {
  if (props.message.role === 'assistant') return 'Assistant';
  if (props.message.role === 'tool') return 'Tool';
  if (props.message.role === 'system') return 'System';
  return 'You';
});

const renderedContent = computed(() =>
  renderMarkdown(props.message.content, { highlight: true })
);

const menuVisible = ref(false);
const menuX = ref(0);
const menuY = ref(0);
let touchTimer: ReturnType<typeof setTimeout> | null = null;

const contextMenuItems = computed<ContextMenuItem[]>(() => [
  { key: 'copy', label: props.t('menu.copy'), icon: 'ri:file-copy-line' },
  { key: 'copyCode', label: props.t('menu.copyCode'), icon: 'ri:code-box-line' },
  { key: 'delete', label: props.t('menu.delete'), icon: 'ri:delete-bin-line', danger: true },
]);

function showContextMenu(e: MouseEvent) {
  menuX.value = e.clientX;
  menuY.value = e.clientY;
  menuVisible.value = true;
}

function handleTouchStart(e: TouchEvent) {
  touchTimer = setTimeout(() => {
    const t = e.touches[0];
    if (t) {
      menuX.value = t.clientX;
      menuY.value = t.clientY;
      menuVisible.value = true;
    }
  }, 500);
}

function handleTouchEnd() {
  if (touchTimer) {
    clearTimeout(touchTimer);
    touchTimer = null;
  }
}

function handleMenuSelect(key: string) {
  if (key === 'copy') {
    navigator.clipboard?.writeText(props.message.content);
    emit('copy', props.message.content);
  } else if (key === 'copyCode') {
    const codes = extractCodeBlocks(props.message.content);
    navigator.clipboard?.writeText(codes.join('\n'));
  }
  menuVisible.value = false;
}

function handleCopy() {
  navigator.clipboard?.writeText(props.message.content);
  emit('copy', props.message.content);
}
</script>

<style scoped>
.oc-message-item {
  display: flex;
  gap: 12px;
  padding: 14px 12px;
  align-items: flex-end;
}
.oc-message-item.user {
  flex-direction: row-reverse;
}
.oc-message-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: linear-gradient(160deg, var(--message-assistant-bg), color-mix(in srgb, var(--message-assistant-bg) 72%, #000));
  flex-shrink: 0;
}
.oc-message-item.user .oc-message-avatar {
  background: linear-gradient(165deg, color-mix(in srgb, var(--message-user-bg) 84%, #fff), var(--message-user-bg));
}
.oc-message-content {
  max-width: min(84%, 860px);
  min-width: 0;
}
.oc-message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  padding: 0 8px;
}
.oc-message-role {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.oc-message-time {
  font-size: 11px;
  color: var(--text-secondary);
}
.oc-message-body {
  font-size: 14px;
  line-height: 1.68;
  border-radius: 16px;
  padding: 12px 14px;
  border: 1px solid var(--border-color);
  background: var(--message-assistant-bg);
  box-shadow: var(--shadow-sm);
}

.oc-message-item.user .oc-message-body {
  background: var(--message-user-bg);
  color: var(--message-user-text);
  border-color: color-mix(in srgb, var(--message-user-bg) 72%, #fff);
}

.oc-message-item.system .oc-message-body {
  background: color-mix(in srgb, #f59e0b 10%, var(--bg-primary));
  border-color: color-mix(in srgb, #f59e0b 40%, var(--border-color));
}
.oc-message-text :deep(pre) {
  overflow-x: auto;
  padding: 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-tertiary) 74%, #000);
}
.oc-message-text :deep(code) {
  font-family: var(--font-mono);
}
.oc-message-cursor {
  display: inline-block;
  animation: blink 1s step-end infinite;
}
@keyframes blink {
  50% { opacity: 0; }
}
.oc-message-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  opacity: 0.62;
  padding-left: 8px;
}
.oc-message-item:hover .oc-message-actions {
  opacity: 1;
}
.oc-message-actions button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 4px;
  border: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--bg-primary) 80%, transparent);
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 999px;
}
.oc-message-actions button:hover {
  background: var(--primary-soft);
  color: var(--primary-color);
}
.oc-message-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.oc-message-img {
  max-width: 220px;
  max-height: 220px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  cursor: pointer;
}

@media (max-width: 900px) {
  .oc-message-content {
    max-width: 100%;
  }
}
</style>
