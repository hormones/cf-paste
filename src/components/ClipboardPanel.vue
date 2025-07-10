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
        :icon="View"
        size="small"
        text
        :title="t('markdown.buttons.preview')"
        @click="switchToPreview"
        class="action-btn"
      />
      <el-button
        v-else-if="appStore.markdownMode === 'preview'"
        :icon="Edit"
        size="small"
        text
        :title="t('markdown.buttons.edit')"
        @click="switchToEdit"
        class="action-btn"
      />

      <!-- Fullscreen Button -->
      <el-button
        :icon="FullScreen"
        size="small"
        text
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
        :icon="View"
        size="small"
        text
        :title="t('markdown.buttons.preview')"
        @click="switchToPreview"
        class="action-btn"
      />
      <el-button
        v-else-if="appStore.markdownMode === 'preview'"
        :icon="Document"
        size="small"
        text
        :title="t('markdown.buttons.edit')"
        @click="switchToEdit"
        class="action-btn"
      />

      <!-- View Mode Fullscreen -->
      <el-button
        :icon="FullScreen"
        size="small"
        text
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
  height: 100%;
  min-height: 192px; /* Maintain minimum height like original textarea */
}

/* Floating action buttons */
.floating-actions {
  position: absolute;
  top: 8px;
  right: 24px;
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
  background-color: var(--color-surface);
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
