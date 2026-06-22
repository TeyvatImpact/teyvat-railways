<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" @click.self="$emit('close')">
      <div class="dialog-box">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ visible: boolean; maxWidth?: string }>();
defineEmits<{ close: [] }>();
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
}
.dialog-box {
  max-width: v-bind('maxWidth ?? "520px"');
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  padding: 24px 28px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}
</style>
