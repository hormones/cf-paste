<template>
  <div class="clipboard-panel">
    <!-- Markdown Editor - visible in edit mode -->
    <MarkdownEditor
      v-show="appStore.markdownMode === 'edit'"
      @auto-save="handleAutoSave"
    />

    <!-- Markdown Preview - visible in preview mode -->
    <MarkdownPreview
      v-show="appStore.markdownMode === 'preview'"
    />

    <!-- Markdown Fullscreen - globally managed -->
    <MarkdownFullscreen
      @auto-save="handleAutoSave"
    />

    <!-- Floating Action Buttons - only visible when not in fullscreen mode -->
    <div
      v-if="appStore.markdownMode !== 'fullscreen' && !appStore.viewMode"
      class="floating-actions"
    >
      <!-- Toggle Edit/Preview Button -->
      <el-button
        v-if="appStore.markdownMode === 'edit'"
        type="primary"
        :icon="View"
        size="small"
        circle
        :title="t('markdown.buttons.preview')"
        @click="switchToPreview"
        class="action-btn"
      />
      <el-button
        v-else-if="appStore.markdownMode === 'preview'"
        type="primary"
        :icon="Edit"
        size="small"
        circle
        :title="t('markdown.buttons.edit')"
        @click="switchToEdit"
        class="action-btn"
      />

      <!-- Fullscreen Button -->
      <el-button
        type="info"
        :icon="FullScreen"
        size="small"
        circle
        :title="t('markdown.buttons.fullscreen')"
        @click="enterFullscreen"
        class="action-btn"
      />
    </div>

    <!-- View-only mode floating actions - show preview toggle only -->
    <div
      v-if="appStore.markdownMode !== 'fullscreen' && appStore.viewMode"
      class="floating-actions"
    >
      <!-- View Mode Preview Toggle -->
      <el-button
        v-if="appStore.markdownMode === 'edit'"
        type="primary"
        :icon="View"
        size="small"
        circle
        :title="t('markdown.buttons.preview')"
        @click="switchToPreview"
        class="action-btn"
      />
      <el-button
        v-else-if="appStore.markdownMode === 'preview'"
        type="primary"
        :icon="Document"
        size="small"
        circle
        :title="t('markdown.buttons.edit')"
        @click="switchToEdit"
        class="action-btn"
      />

      <!-- View Mode Fullscreen -->
      <el-button
        type="info"
        :icon="FullScreen"
        size="small"
        circle
        :title="t('markdown.buttons.fullscreen')"
        @click="enterFullscreen"
        class="action-btn"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { View, Edit, FullScreen, Document } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores'
import { useI18nComposable } from '@/composables/useI18n'
import MarkdownEditor from './MarkdownEditor.vue'
import MarkdownPreview from './MarkdownPreview.vue'
import MarkdownFullscreen from './MarkdownFullscreen.vue'

// Maintain compatibility with parent component interface
const modelValue = defineModel<string>()
const emit = defineEmits(['auto-save'])

const appStore = useAppStore()
const { t } = useI18nComposable()

// Sync modelValue with store content for backward compatibility
const syncedContent = computed({
  get: () => appStore.keyword.content || '',
  set: (value: string) => {
    appStore.updateKeywordFields({ content: value })
    // Update modelValue to maintain v-model compatibility
    if (modelValue.value !== value) {
      modelValue.value = value
    }
  }
})

// Watch modelValue changes from parent and sync to store
const syncFromParent = computed(() => {
  if (modelValue.value !== undefined && modelValue.value !== syncedContent.value) {
    appStore.updateKeywordFields({ content: modelValue.value })
  }
  return modelValue.value
})

// Mode switching functions
const switchToEdit = () => {
  appStore.setMarkdownMode('edit')
}

const switchToPreview = () => {
  appStore.setMarkdownMode('preview')
}

const enterFullscreen = () => {
  appStore.setMarkdownMode('fullscreen')
}

// Handle auto-save events from child components
const handleAutoSave = () => {
  // Maintain compatibility with existing auto-save logic
  if (appStore.viewMode) {
    return
  }
  if (appStore.lastSavedContent === syncedContent.value) {
    return
  }
  emit('auto-save')
}

// Initialize sync on mount - ensure store and modelValue are in sync
syncFromParent
</script>

<style scoped>
.clipboard-panel {
  position: relative;
  width: 100%;
  min-height: 192px; /* Maintain minimum height like original textarea */
}

/* Floating action buttons */
.floating-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  z-index: 10;
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.floating-actions:hover {
  opacity: 1;
}

.action-btn {
  width: 28px !important;
  height: 28px !important;
  font-size: 14px;
  backdrop-filter: blur(8px);
  background-color: var(--el-color-primary);
  border: 1px solid var(--el-border-color-light);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.action-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Mobile responsive adjustments */
@media (max-width: 768px) {
  .floating-actions {
    top: 6px;
    right: 6px;
    gap: 6px;
  }

  .action-btn {
    width: 32px !important;
    height: 32px !important;
    font-size: 16px;
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .action-btn {
    backdrop-filter: blur(8px);
    background-color: rgba(0, 0, 0, 0.6);
    border-color: var(--el-border-color-darker);
  }

  .floating-actions:hover {
    opacity: 0.95;
  }
}

/* Ensure child components fill the container */
:deep(.markdown-editor),
:deep(.markdown-preview) {
  width: 100%;
  min-height: 192px;
}

/* Remove extra borders when nested in TabsContainer */
:deep(.markdown-editor),
:deep(.markdown-preview) {
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  background-color: var(--color-surface);
  transition: background-color 0.5s, border-color 0.5s;
}
</style>
