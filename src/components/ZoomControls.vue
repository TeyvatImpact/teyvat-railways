<template>
  <div class="zoom-controls">
    <button @click="$emit('update:scale', Math.min(5, scale + 0.2))">+</button>
    <span>{{ Math.round(scale * 100) }}%</span>
    <button @click="$emit('update:scale', Math.max(0.2, scale - 0.2))">−</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ scale: number }>();
defineEmits<{ 'update:scale': [value: number] }>();
</script>

<style scoped>
.zoom-controls {
  position: fixed;
  bottom: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 8px;
  padding: 6px 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
  font-family: sans-serif;
  font-size: 14px;
}
.zoom-controls button {
  width: 28px;
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}
.zoom-controls button:hover {
  background: #eee;
}
</style>
