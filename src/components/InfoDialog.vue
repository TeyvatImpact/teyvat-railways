<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" @click.self="$emit('close')">
      <div class="dialog-box markdown-body" v-html="html"></div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { createMarkdownExit } from 'markdown-exit';
import raw from '../intro.md?raw';

const props = defineProps<{ visible: boolean }>();
defineEmits<{ close: [] }>();

const md = createMarkdownExit();
const html = computed(() => md.render(raw));
</script>

<style>
@import 'github-markdown-css/github-markdown-light.css';

.markdown-body {
  background: #eeeeee !important;
}
</style>

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
  max-width: 520px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  padding: 24px 28px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}
</style>
