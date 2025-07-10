<template>
  <!-- Simple fullscreen overlay -->
  <div
    v-if="isVisible"
    class="markdown-fullscreen"
    @keydown.esc="handleClose"
    tabindex="0"
  >
    <!-- Header with stats and close button -->
    <div class="markdown-fullscreen-header">
      <div class="markdown-fullscreen-stats">
        {{ t('markdown.stats', {
          characters: stats.characters,
          words: stats.words
        }) }}
      </div>
      <el-button
        size="small"
        :icon="Close"
        text
        @click="handleClose"
        :title="t('markdown.buttons.exit')"
      />
    </div>

    <!-- Main content area with flex layout -->
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
  </div>
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

// Control visibility based on store state
const isVisible = computed(() => appStore.markdownMode === 'fullscreen')

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
  if (!appStore.viewMode && editorRef.value?.textareaRef && previewRef.value?.previewRef) {
    const editorElement = editorRef.value.textareaRef
    const previewElement = previewRef.value.previewRef

        // Check if elements are valid DOM nodes
    if (editorElement && previewElement) {
      scrollSyncCleanup = setupScrollSync(
        editorElement,
        previewElement
      )
    }
  }
}, 16)

// Handle auto-save from editor
const handleAutoSave = () => {
  emit('auto-save')
}

// Handle close
const handleClose = () => {
  if (appStore.viewMode) {
    appStore.setMarkdownMode('preview')
  } else {
    appStore.setMarkdownMode('edit')
  }
}

// Watch for visibility changes to setup/cleanup scroll sync
watch(isVisible, (visible) => {
  if (visible) {
    // Setup scroll sync when fullscreen opens
    // Use longer delay to ensure DOM is ready
    setTimeout(() => {
      setupScrollSynchronization()
    }, 200)

    // Prevent body scroll
    document.body.style.overflow = 'hidden'
  } else {
    // Cleanup when fullscreen closes
    if (scrollSyncCleanup) {
      scrollSyncCleanup()
      scrollSyncCleanup = null
    }

    // Restore body scroll
    document.body.style.overflow = ''
  }
})

// Watch for viewMode changes to update scroll sync
watch(() => appStore.viewMode, () => {
  if (isVisible.value) {
    setTimeout(() => {
      setupScrollSynchronization()
    }, 100)
  }
})

// Watch for content changes to re-setup scroll sync
watch(() => appStore.keyword.content, () => {
  if (isVisible.value && !appStore.viewMode) {
    // Re-setup scroll sync when content changes to ensure proper height calculations
    setTimeout(() => {
      setupScrollSynchronization()
    }, 100)
  }
})

// Cleanup on unmount
onUnmounted(() => {
  if (scrollSyncCleanup) {
    scrollSyncCleanup()
  }
  // Restore body scroll
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* Simple fullscreen overlay */
.markdown-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3000;
  background: var(--color-background);
  display: flex;
  flex-direction: column;
  outline: none;
}

/* Header styling */
.markdown-fullscreen-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color);
  background: var(--color-surface);
  flex-shrink: 0;
}

.markdown-fullscreen-stats {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

/* Content area with flex=1 */
.markdown-fullscreen-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Panel styling for left-right layout */
.markdown-fullscreen-panel {
  flex: 1;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.markdown-fullscreen-editor {
  border-right: 1px solid var(--el-border-color);
}

.markdown-fullscreen-preview.is-full-width {
  flex: 1;
}

/* Ensure child components fill the panel */
.markdown-fullscreen :deep(.markdown-editor),
.markdown-fullscreen :deep(.markdown-preview) {
  height: 100%;
  flex: 1;
  border: none;
  border-radius: 0;
}

.markdown-fullscreen :deep(.markdown-editor__textarea),
.markdown-fullscreen :deep(.markdown-preview) {
  max-height: none;
  height: 100%;
  border-radius: 0;
}

/* Hide stats in editor when in fullscreen */
.markdown-fullscreen :deep(.markdown-editor__stats) {
  display: none;
}

/* Responsive design for mobile */
@media (max-width: 768px) {
  .markdown-fullscreen-content {
    flex-direction: column;
  }

  .markdown-fullscreen-editor {
    border-right: none;
    border-bottom: 1px solid var(--el-border-color);
    flex: 1;
    max-height: 50%;
  }

  .markdown-fullscreen-preview {
    flex: 1;
    max-height: 50%;
  }

  .markdown-fullscreen-preview.is-full-width {
    max-height: 100%;
    flex: 1;
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .markdown-fullscreen-header {
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

/* Smooth transitions */
.markdown-fullscreen {
  transition: opacity 0.3s ease;
}

.markdown-fullscreen-panel {
  transition: flex 0.3s ease;
}
</style>
