<template>
  <div class="oc-chat-input">
    <QuickCommands
      v-if="showCommands"
      :visible="showCommands"
      :query="commandQuery"
      @select="handleCommandSelect"
    />
    <div class="oc-chat-input-wrapper">
      <textarea
        ref="textareaRef"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        rows="1"
        class="oc-chat-input-field"
        @input="handleInput"
        @keydown.enter.prevent="handleEnter"
      />
      <button
        class="oc-chat-input-send"
        :disabled="!canSend || disabled"
        @click="handleSend"
      >
        <Icon icon="ri:send-plane-fill" />
      </button>
    </div>
    <div v-if="queuedCount > 0" class="oc-chat-input-queue">
      {{ t('chat.queued', { count: queuedCount }) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Icon } from '@iconify/vue';
import QuickCommands from './QuickCommands.vue';
import { COMMANDS, parseCommand } from '../utils/commands.js';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    disabled?: boolean;
    queuedCount?: number;
    placeholder?: string;
    t: (key: string, params?: Record<string, number>) => string;
  }>(),
  { disabled: false, queuedCount: 0, placeholder: '' }
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  send: [content: string, images?: File[]];
  command: [cmd: string, args: string];
}>();

const textareaRef = ref<HTMLTextAreaElement>();
const showCommands = ref(false);
const commandQuery = ref('');

const canSend = computed(() => props.modelValue.trim().length > 0);

function handleInput(e: Event) {
  const el = e.target as HTMLTextAreaElement;
  emit('update:modelValue', el.value);
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';

  const val = el.value;
  const match = val.match(/\/(\w*)/);
  if (match && val.endsWith(match[0])) {
    showCommands.value = true;
    commandQuery.value = match[1];
  } else {
    showCommands.value = false;
  }
}

function handleEnter(e: KeyboardEvent) {
  if (e.shiftKey) return;
  handleSend();
}

function handleSend() {
  if (!canSend.value) return;
  const text = props.modelValue.trim();
  const parsed = parseCommand(text);
  if (parsed) {
    const cmd = COMMANDS.find((c) => c.key.startsWith(parsed.cmd));
    if (cmd) {
      emit('command', cmd.key, parsed.query);
      emit('update:modelValue', '');
      return;
    }
  }
  emit('send', text);
  emit('update:modelValue', '');
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto';
  }
}

function handleCommandSelect(cmd: (typeof COMMANDS)[number]) {
  if (cmd.key === 'new' || cmd.key === 'clear') {
    emit('command', cmd.key, '');
    emit('update:modelValue', '');
  } else {
    emit('update:modelValue', `/${cmd.key} `);
  }
  showCommands.value = false;
}
</script>

<style scoped>
.oc-chat-input {
  position: relative;
  padding: 12px 14px 16px;
  border-top: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--bg-primary) 74%, transparent);
  backdrop-filter: blur(8px);
}
.oc-chat-input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}
.oc-chat-input-field {
  flex: 1;
  min-height: 44px;
  max-height: 200px;
  padding: 11px 14px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: color-mix(in srgb, var(--bg-primary) 84%, transparent);
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.5;
  font-family: var(--font-ui);
  resize: none;
  outline: none;
  box-shadow: inset 0 1px 1px rgba(15, 23, 42, 0.05);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.oc-chat-input-field:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary-color) 18%, transparent);
}
.oc-chat-input-send {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border: none;
  border-radius: 14px;
  background: var(--primary-color);
  color: white;
  cursor: pointer;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--primary-color) 35%, transparent);
  transition: transform var(--transition-fast), background var(--transition-fast);
}
.oc-chat-input-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}
.oc-chat-input-send:not(:disabled):hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
}
.oc-chat-input-queue {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 7px;
  padding-left: 2px;
}
</style>
