<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="oc-context-menu"
      :style="{ left: x + 'px', top: y + 'px' }"
      @click.stop
    >
      <button
        v-for="item in items"
        :key="item.key"
        class="oc-context-menu-item"
        :class="{ 'oc-context-menu-item--danger': item.danger }"
        @click="emit('select', item.key)"
      >
        <span v-if="item.icon" class="oc-context-menu-icon">
          <Icon v-if="item.icon" :icon="item.icon" />
        </span>
        {{ item.label }}
      </button>
    </div>
    <div
      v-if="visible"
      class="oc-context-menu-backdrop"
      @click="emit('update:visible', false)"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';

export interface ContextMenuItem {
  key: string;
  label: string;
  icon?: string;
  danger?: boolean;
}

defineProps<{
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  select: [key: string];
}>();
</script>

<style scoped>
.oc-context-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
}
.oc-context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 140px;
  padding: 4px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.oc-context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  color: var(--text-primary);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  border-radius: 4px;
}
.oc-context-menu-item:hover {
  background: var(--bg-secondary);
}
.oc-context-menu-item--danger {
  color: #ef4444;
}
.oc-context-menu-icon {
  display: flex;
  align-items: center;
}
</style>
