<template>
  <el-dialog
    v-model="isVisible"
    class="markdown-fullscreen-dialog"
    :fullscreen="true"
    :destroy-on-close="true"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    @close="handleClose"
  >
    <!-- Custom header with stats and close button -->
    <template #header>
      <div class="markdown-fullscreen-header">
        <div class="markdown-fullscreen-stats">
          {{ t('markdown.stats', {
            characters: stats.characters,
            words: stats.words
          }) }}
        </div>
        <el-button
          type="primary"
          :icon="Close"
          circle
          @click="handleClose"
          :title="t('markdown.buttons.exit')"
        />
      </div>
    </template>

    <!-- Fullscreen content area -->
    <div class="markdown-fullscreen-content">
      <!-- Editor panel - hidden in view mode -->
      <div
        v-if="!appStore.viewMode"
        class="markdown-fullscreen-panel markdown-fullscreen-editor"
      >
        <MarkdownEditor
          ref="editorRef"
          :show-stats="false"
          @auto-save="handleAutoSave"
        />
      </div>

      <!-- Preview panel -->
      <div
        class="markdown-fullscreen-panel markdown-fullscreen-preview"
        :class="{ 'is-full-width': appStore.viewMode }"
      >
        <MarkdownPreview ref="previewRef" />
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores'
import { useI18nComposable } from '@/composables/useI18n'
import { useClipboard } from '@/composables/useClipboard'
import MarkdownEditor from './MarkdownEditor.vue'
import MarkdownPreview from './MarkdownPreview.vue'

const emit = defineEmits(['auto-save'])

const appStore = useAppStore()
const { t } = useI18nComposable()
const { calculateStats, setupScrollSync, debounce } = useClipboard()

const editorRef = ref<InstanceType<typeof MarkdownEditor> | null>(null)
const previewRef = ref<InstanceType<typeof MarkdownPreview> | null>(null)

// Control dialog visibility based on store state
const isVisible = computed({
  get: () => appStore.markdownMode === 'fullscreen',
  set: (value: boolean) => {
    if (!value) {
      handleClose()
    }
  }
})

// Calculate content statistics
const stats = computed(() => {
  const content = appStore.keyword.content || ''
  return calculateStats(content)
})

// Scroll sync cleanup function
let scrollSyncCleanup: (() => void) | null = null

// Setup scroll synchronization with debouncing
const setupScrollSynchronization = debounce(() => {
  // Clean up previous sync if exists
  if (scrollSyncCleanup) {
    scrollSyncCleanup()
  }

  // Only setup sync if both refs are available and not in view mode
  if (editorRef.value?.textareaRef && previewRef.value?.previewRef && !appStore.viewMode) {
    // Create temporary refs that point to the exposed refs from child components
    const editorScrollRef = editorRef.value.textareaRef
    const previewScrollRef = previewRef.value.previewRef

    scrollSyncCleanup = setupScrollSync(
      editorScrollRef,
      previewScrollRef
    )
  }
}, 16) // 16ms debounce for smooth performance

// Handle auto-save from editor
const handleAutoSave = () => {
  emit('auto-save')
}

// Handle dialog close
const handleClose = () => {
  // Return to previous mode based on viewMode
  if (appStore.viewMode) {
    appStore.setMarkdownMode('preview')
  } else {
    appStore.setMarkdownMode('edit')
  }
}

// Handle ESC key press
const handleEscKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isVisible.value) {
    event.preventDefault()
    handleClose()
  }
}

// Watch for dialog visibility changes to setup/cleanup scroll sync
watch(isVisible, (visible) => {
  if (visible) {
    // Setup scroll sync when dialog opens
    setTimeout(setupScrollSynchronization, 100)

    // Add ESC key listener
    document.addEventListener('keydown', handleEscKey)
  } else {
    // Cleanup when dialog closes
    if (scrollSyncCleanup) {
      scrollSyncCleanup()
      scrollSyncCleanup = null
    }

    // Remove ESC key listener
    document.removeEventListener('keydown', handleEscKey)
  }
})

// Watch for viewMode changes to update scroll sync
watch(() => appStore.viewMode, () => {
  if (isVisible.value) {
    setupScrollSynchronization()
  }
})

// Cleanup on unmount
onUnmounted(() => {
  if (scrollSyncCleanup) {
    scrollSyncCleanup()
  }
  document.removeEventListener('keydown', handleEscKey)
})
</script>

<style scoped>
/* Override Element Plus dialog styles for fullscreen */
:deep(.el-dialog) {
  margin: 0;
  border-radius: 0;
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
}

:deep(.el-dialog__header) {
  padding: 12px 16px;
  margin: 0;
  border-bottom: 1px solid var(--el-border-color);
  background: var(--color-surface);
}

:deep(.el-dialog__body) {
  padding: 0;
  height: calc(100vh - 60px); /* Subtract header height */
  overflow: hidden;
}

.markdown-fullscreen-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.markdown-fullscreen-stats {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

.markdown-fullscreen-content {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.markdown-fullscreen-panel {
  flex: 1;
  height: 100%;
  overflow: hidden;
}

.markdown-fullscreen-editor {
  border-right: 1px solid var(--el-border-color);
}

.markdown-fullscreen-preview.is-full-width {
  flex: 1;
}

/* Remove borders from child components in fullscreen */
:deep(.markdown-editor),
:deep(.markdown-preview) {
  height: 100%;
  border: none;
  border-radius: 0;
}

:deep(.markdown-editor__textarea),
:deep(.markdown-preview) {
  max-height: none;
  height: 100%;
  border-radius: 0;
}

/* Hide stats in editor when in fullscreen */
:deep(.markdown-editor__stats) {
  display: none;
}

/* Responsive design */
@media (max-width: 768px) {
  .markdown-fullscreen-content {
    flex-direction: column;
  }

  .markdown-fullscreen-editor {
    border-right: none;
    border-bottom: 1px solid var(--el-border-color);
    max-height: 50%;
  }

  .markdown-fullscreen-preview {
    max-height: 50%;
  }

  .markdown-fullscreen-preview.is-full-width {
    max-height: 100%;
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  :deep(.el-dialog__header) {
    border-bottom-color: var(--el-border-color-darker);
  }

  .markdown-fullscreen-editor {
    border-right-color: var(--el-border-color-darker);
  }

  @media (max-width: 768px) {
    .markdown-fullscreen-editor {
      border-bottom-color: var(--el-border-color-darker);
    }
  }
}
</style>
