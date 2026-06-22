<template>
  <div v-if="mouseCoord" class="mouse-coord">{{ mouseCoord }}</div>
</template>

<script setup lang="ts">
defineProps<{ mouseCoord?: string | null }>()
</script>

<style scoped>
.mouse-coord {
  position: fixed; bottom: 12px; left: 12px;
  background: rgba(255,255,255,0.92); border-radius: 8px;
  padding: 6px 10px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  font-family: 'Courier New', monospace;
  font-size: 13px; color: #555; z-index: 10;
}
</style>
