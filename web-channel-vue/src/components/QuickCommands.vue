<template>
  <div v-if="visible && filteredCommands.length" class="oc-quick-commands">
    <button
      v-for="cmd in filteredCommands"
      :key="cmd.key"
      class="oc-quick-commands-item"
      @click="emit('select', cmd)"
    >
      <span class="oc-quick-commands-label">{{ cmd.label }}</span>
      <span class="oc-quick-commands-desc">{{ cmd.description }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { COMMANDS } from '../utils/commands.js';

const props = defineProps<{
  visible: boolean;
  query: string;
}>();

const emit = defineEmits<{
  select: [typeof COMMANDS[number]];
}>();

const filteredCommands = computed(() => {
  const q = props.query.toLowerCase();
  if (!q) return COMMANDS;
  return COMMANDS.filter(
    (c) =>
      c.key.toLowerCase().includes(q) ||
      c.label.toLowerCase().includes(q)
  );
});
</script>

<style scoped>
.oc-quick-commands {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  margin-bottom: 8px;
  padding: 6px;
  background: color-mix(in srgb, var(--bg-primary) 92%, transparent);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(8px);
  max-height: 200px;
  overflow-y: auto;
}
.oc-quick-commands-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  color: var(--text-primary);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  border-radius: 10px;
}
.oc-quick-commands-item:hover {
  background: var(--primary-soft);
}
.oc-quick-commands-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}
</style>
