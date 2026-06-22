<template>
  <TitleBar @open="showDialog = true" />
  <RailwayMap />
  <InfoDialog :visible="showDialog" @close="onClose" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import RailwayMap from './components/RailwayMap.vue'
import TitleBar from './components/TitleBar.vue'
import InfoDialog from './components/InfoDialog.vue'

const STORAGE_KEY = 'teyvat-railways-visited'
const showDialog = ref(false)

function onClose() {
  showDialog.value = false
  localStorage.setItem(STORAGE_KEY, '1')
}

onMounted(() => {
  if (!localStorage.getItem(STORAGE_KEY)) {
    showDialog.value = true
  }
})
</script>
