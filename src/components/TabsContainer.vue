<template>
  <div class="tabs-container">
    <!-- Top action bar -->
    <div class="tabs-header">
      <el-tabs v-model="activeTab">
        <el-tab-pane :label="t('clipboard.tab')" name="clipboard" />
        <el-tab-pane :label="fileTabLabel" name="files" />
      </el-tabs>
    </div>

    <!-- Content area -->
    <div class="tab-content">
      <div v-show="activeTab === 'clipboard'" class="tab-pane clipboard-panel-wrapper">
        <ClipboardPanel v-model="appStore.keyword.content" @auto-save="handleAutoSave" />
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
import { useAppStore } from '@/stores'
import { useMain } from '@/composables/useMain'
import { useI18nComposable } from '@/composables/useI18n'

const activeTab = ref('clipboard')
const appStore = useAppStore()
const { saveKeyword } = useMain()
const { t } = useI18nComposable()

// Localized file tab title
const fileTabLabel = computed(() => {
  const count = appStore.fileList.length
  const baseLabel = t('file.tab')
  return count > 0 ? `${baseLabel} (${count})` : baseLabel
})

const handleAutoSave = () => {
  if (!appStore.keyword.id && !appStore.keyword.content) {
    return
  }
  saveKeyword()
}
</script>

<style scoped>
.tabs-container {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: border-color 0.5s, background-color 0.5s;
  overflow: hidden; /* Prevent child elements from overflowing rounded corners */
}

/* Override Element Plus styles */
:deep(.el-tabs__header) {
  margin-bottom: 0;
}
:deep(.el-tabs__nav-wrap::after) {
  display: none; /* Remove bottom divider */
}
:deep(.el-tabs__item) {
  padding: 0 16px; /* Reduce padding */
}
:deep(.el-tabs__item.is-active) {
  color: var(--el-color-primary); /* Maintain brand color for active state */
}

.tab-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0; /* Prevent button group from being compressed */
}

.tab-content {
  flex-grow: 1;
}

.tab-pane {
  height: 100%;
}

.clipboard-panel-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}

/* Mobile styles */
@media (max-width: 768px) {
  .tabs-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
}

.mobile-info-btn {
  display: none;
}

.layout-flex {
  display: flex;
  flex-direction: column;
  gap: 20px;
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
