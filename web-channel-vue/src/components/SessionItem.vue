<template>
  <div
    class="oc-session-item"
    :class="{ 'oc-session-item--active': isActive }"
    @click="emit('select')"
  >
    <span class="oc-session-item-title">{{ session.title }}</span>
  </div>
</template>

<script setup lang="ts">
import type { Session } from '../types/index.js';

defineProps<{
  session: Session;
  isActive: boolean;
}>();

const emit = defineEmits<{
  select: [];
}>();
</script>

<style scoped>
.oc-session-item {
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
}
.oc-session-item:hover {
  background: color-mix(in srgb, var(--bg-primary) 80%, transparent);
  border-color: var(--border-color);
  transform: translateY(-1px);
}
.oc-session-item--active {
  background: color-mix(in srgb, var(--primary-soft) 80%, transparent);
  border-color: color-mix(in srgb, var(--primary-color) 30%, var(--border-color));
}
.oc-session-item-title {
  font-size: 13px;
  font-weight: 620;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
</style>
