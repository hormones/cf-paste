<template>
  <div class="clipboard-panel">
    <MarkdownEditor
      v-model="appStore.keyword.content"
      @blur="handleBlur"
      @save="saveKeyword"
    />
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores'
import { useMain } from '@/composables/useMain'
import MarkdownEditor from './MarkdownEditor.vue'

const appStore = useAppStore()
const { saveKeyword } = useMain()

function handleBlur(): void {
  // Auto-save on blur if content has changed
  if (appStore.viewMode) return
  if (appStore.lastSavedContent === appStore.keyword.content) return
  saveKeyword()
}
</script>

<style scoped>
.clipboard-panel {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.markdown-editor) {
  border: none;
  border-radius: 0;
}
</style>
