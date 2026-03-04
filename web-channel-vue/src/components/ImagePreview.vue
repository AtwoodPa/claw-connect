<template>
  <Teleport to="body">
    <div
      v-if="visible && src"
      class="oc-image-preview-backdrop"
      @click="emit('update:visible', false)"
    >
      <img
        :src="src"
        class="oc-image-preview-img"
        alt="Preview"
        @click.stop
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  src: string;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();
</script>

<style scoped>
.oc-image-preview-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  cursor: zoom-out;
}
.oc-image-preview-img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 4px;
}
</style>
