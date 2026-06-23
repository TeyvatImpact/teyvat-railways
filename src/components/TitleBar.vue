<script setup lang="ts">
defineProps<{ theme: 'light' | 'dark' }>();
defineEmits<{ open: []; 'open-ai': []; 'toggle-theme': []; 'toggle-admin': [] }>();
</script>

<template>
  <var-app-bar type="surface">
    <span class="title">提瓦特铁路网</span>
    <template #right>
      <div class="flex gap-1">
        <var-button @click="$emit('toggle-theme')">
          {{ theme === 'dark' ? '浅色主题' : '深色主题' }}
        </var-button>
        <var-button @click="$emit('open')">关于</var-button>
        <var-button @click="$emit('open-ai')">AI 提示词</var-button>
        <var-button @click="$emit('toggle-admin')">🛠</var-button>
      </div>
    </template>
  </var-app-bar>
</template>
