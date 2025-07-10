<template>
  <div class="clipboard-panel">
    <MarkdownEditor
      ref="markdownEditorRef"
      v-model="appStore.keyword.content"
      :mode="editorMode"
      :is-fullscreen="isFullscreen"
      :keyword="appStore.keyword.word"
      @blur="handleBlur"
      @rendered="handleRendered"
      @error="handleRenderError"
      @exit-fullscreen="exitFullscreen"
      @save="saveKeyword"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '@/stores'
import { useI18nComposable } from '@/composables/useI18n'
import { useMain } from '@/composables/useMain'
import { MARKDOWN_MODE } from '@/constant'
import MarkdownEditor from './MarkdownEditor.vue'

// Store and composables
const appStore = useAppStore()
const { t } = useI18nComposable()
const { saveKeyword } = useMain()

// Component ref
const markdownEditorRef = ref<InstanceType<typeof MarkdownEditor>>()

// Computed properties
const isFullscreen = computed(() => appStore.markdownMode === MARKDOWN_MODE.FULLSCREEN)

const editorMode = computed(() => {
  switch (appStore.markdownMode) {
    case MARKDOWN_MODE.PREVIEW:
      return 'preview'
    case MARKDOWN_MODE.FULLSCREEN:
      return 'split' // Fullscreen uses split mode
    default:
      return 'edit'
  }
})

// Event handlers
function handleBlur(): void {
  // Auto-save on blur if content has changed
  if (appStore.viewMode) return
  if (appStore.lastSavedContent === appStore.keyword.content) return
  saveKeyword()
}

function handleRendered(html: string): void {
  console.log('✅ Content rendered successfully')
}

function handleRenderError(error: Error): void {
  console.error('❌ Markdown rendering error:', error)
  // Optional: Show user notification
}

function exitFullscreen(): void {
  // When exiting fullscreen, revert to the previous mode or a default.
  // 'edit' is a safe default.
  appStore.setMarkdownMode(MARKDOWN_MODE.EDIT)
}


// Expose methods for external access
defineExpose({
  markdownEditorRef,
  focus: () => markdownEditorRef.value?.focus(),
  refresh: () => markdownEditorRef.value?.refresh(),
  reprocessDiagrams: () => markdownEditorRef.value?.reprocessDiagrams()
})
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
