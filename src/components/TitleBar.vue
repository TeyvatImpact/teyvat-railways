<template>
  <div class="title-bar">
    <span class="title">提瓦特铁路网</span>
    <button class="info-btn" @click="$emit('open')">关于</button>
  </div>
</template>

<script setup lang="ts">
defineEmits<{ open: [] }>()
</script>

<style scoped>
.title-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #e0e0e0;
  user-select: none;
}
.title {
  font-size: 18px;
  font-weight: 700;
  color: #333;
}
.info-btn {
  padding: 6px 14px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
  color: #555;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
}
.info-btn:hover {
  background: #f0f0f0;
}
</style>
