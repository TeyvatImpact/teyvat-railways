<template>
  <div class="map-controls">
    <span v-if="mouseCoord" class="coord">{{ mouseCoord }}</span>
    <span v-else class="coord-placeholder" />
    <div class="zoom-group">
      <button @click="$emit('update:scale', Math.min(5, scale + 0.2))">+</button>
      <span>{{ Math.round(scale * 100) }}%</span>
      <button @click="$emit('update:scale', Math.max(0.2, scale - 0.2))">−</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ mouseCoord?: string | null; scale: number }>();
defineEmits<{ 'update:scale': [value: number] }>();
</script>

<style scoped>
.map-controls {
  position: fixed;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--color-surface-container);
  border-radius: 8px;
  padding: 6px 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: var(--color-text);
}
.coord-placeholder {
  min-width: 80px;
}
.zoom-group {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: sans-serif;
  font-size: 14px;
}
.zoom-group button {
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-outline);
  border-radius: 4px;
  background: var(--color-surface-container-high);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  color: var(--color-text);
}
.zoom-group button:hover {
  background: var(--color-surface-container-highest);
}
</style>
