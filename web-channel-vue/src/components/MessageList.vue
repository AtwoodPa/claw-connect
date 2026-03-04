<template>
  <div ref="listRef" class="oc-message-list" @scroll="handleScroll">
    <MessageItem
      v-for="msg in messages"
      :key="msg.id"
      :message="msg"
      :is-streaming="streaming && msg.role === 'assistant' && msg.id === streamingMessageId"
      :t="t"
      @copy="emit('copy', $event)"
      @preview="emit('preview-image', $event)"
      @regenerate="emit('regenerate')"
    />
    <div v-if="loading && !messages.length" class="oc-message-list-empty">
      {{ t('chat.think') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import MessageItem from './MessageItem.vue';
import type { Message } from '../types/index.js';

const props = defineProps<{
  messages: Message[];
  streaming?: boolean;
  streamingMessageId?: string;
  loading?: boolean;
  t: (key: string) => string;
}>();

const emit = defineEmits<{
  'scroll-top': [];
  copy: [text: string];
  'preview-image': [url: string];
  regenerate: [];
}>();

const listRef = ref<HTMLElement>();

function handleScroll() {
  const el = listRef.value;
  if (!el) return;
  if (el.scrollTop < 50) {
    emit('scroll-top');
  }
}

watch(
  () => props.messages.length,
  async () => {
    await nextTick();
    const el = listRef.value;
    if (!el) {
      return;
    }
    const nearBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) < 140;
    if (nearBottom || props.streaming) {
      el.scrollTop = el.scrollHeight;
    }
  },
);
</script>

<style scoped>
.oc-message-list {
  flex: 1;
  overflow-y: auto;
  padding: 14px 14px 18px;
}
.oc-message-list-empty {
  padding: 24px;
  color: var(--text-secondary);
  text-align: center;
  border: 1px dashed var(--border-color);
  border-radius: 14px;
  background: color-mix(in srgb, var(--bg-primary) 80%, transparent);
}
</style>
