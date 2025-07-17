<template>
  <div class="tabs-container">
    <!-- Top action bar -->
    <div class="tabs-header">
      <el-tabs v-model="activeTab">
        <el-tab-pane :label="t('clipboard.tab')" name="clipboard" />
        <el-tab-pane :label="fileTabLabel" name="files" />
      </el-tabs>

      <!-- Markdown control buttons - only show when clipboard tab is active and not in viewMode -->
      <div v-if="activeTab === 'clipboard'" class="markdown-controls">
        <!-- Toggle Edit/Preview Button -->
        <el-button
          v-if="appStore.markdownMode === EDIT"
          :icon="View"
          size="small"
          text
          :title="t('common.buttons.preview')"
          @click="appStore.setMarkdownMode(MARKDOWN_MODE.PREVIEW)"
        />
        <el-button
          v-else-if="!appStore.viewMode"
          :icon="Edit"
          size="small"
          text
          :title="t('common.buttons.edit')"
          @click="appStore.setMarkdownMode(MARKDOWN_MODE.EDIT)"
        />

        <!-- Fullscreen Button -->
        <el-button
          v-if="!appStore.viewMode"
          :icon="FullScreen"
          size="small"
          text
          :title="t('common.buttons.fullscreen')"
          @click="appStore.setMarkdownMode(MARKDOWN_MODE.FULLSCREEN)"
        />

        <!-- Copy Content Button -->
        <el-button
          :icon="CopyDocument"
          size="small"
          text
          :title="t('clipboard.copyContent')"
          @click="copyContent"
        />
      </div>
    </div>

    <!-- Content area -->
    <div class="tab-content">
      <div v-show="activeTab === 'clipboard'" class="tab-pane clipboard-panel-wrapper">
        <ClipboardPanel />
      </div>
      <div v-show="activeTab === 'files'" class="layout-flex">
        <FileUploadPanel v-if="!appStore.viewMode" />
        <FileTable />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { View, Edit, FullScreen, CopyDocument } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAppStore } from '@/stores'
import { useI18n } from '@/composables/useI18n'
import { MARKDOWN_MODE } from '../constants'

const activeTab = ref('clipboard')
const appStore = useAppStore()
const { t } = useI18n()

// Expose constants for template use
const { EDIT, PREVIEW, FULLSCREEN } = MARKDOWN_MODE

// Localized file tab title
const fileTabLabel = computed(() => {
  const count = appStore.fileList.length
  const baseLabel = t('file.tab')
  return count > 0 ? `${baseLabel} (${count})` : baseLabel
})

// Copy clipboard content
const copyContent = async () => {
  const content = appStore.keyword.content || ''
  if (!content.trim()) {
    ElMessage.warning(t('clipboard.emptyContent'))
    return
  }

  try {
    await navigator.clipboard.writeText(content)
    ElMessage.success(t('clipboard.contentCopied'))
  } catch (error) {
    console.error('Failed to copy content:', error)
    ElMessage.error(t('clipboard.copyFailed'))
  }
}
</script>

<style scoped>
.tabs-container {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

/* Header with tabs and control buttons */
.tabs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

/* Markdown control buttons */
.markdown-controls {
  display: flex;
  gap: 4px;
  opacity: 0.8;
  transition: opacity 0.3s ease;
  flex-shrink: 0;
}

.markdown-controls:hover {
  opacity: 1;
}

/* Override Element Plus tab styles */
:deep(.el-tabs__header) {
  margin-bottom: 0;
  flex-shrink: 1;
  min-width: 0;
}

:deep(.el-tabs__nav-wrap::after) {
  display: none;
}

:deep(.el-tabs__item) {
  padding: 0 10px;
  font-size: 14px;
}

:deep(.el-tabs__item.is-active) {
  color: var(--el-color-primary);
}

/* Compact button styling */
.markdown-controls :deep(.el-button) {
  padding: 4px 8px;
  min-height: 28px;
  font-size: 13px;
}

/* Content area */
.tab-content {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.tab-pane {
  height: 100%;
}

.clipboard-panel-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.layout-flex {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Utility classes */
.mobile-info-btn {
  display: none;
}

@media (max-width: 992px) {
  .mobile-info-btn {
    display: inline-flex;
  }
}

.paste-tabs {
  --el-tabs-header-height: 48px;
}
</style>
