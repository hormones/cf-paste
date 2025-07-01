<template>
  <div class="tabs-container">
    <!-- 顶部操作栏 -->
    <div class="tabs-header">
      <el-tabs
        v-model="activeTab"
        class="layout-container tabs-clean"
      >
        <el-tab-pane v-if="showClipboardTab" label="剪贴板" name="clipboard" />
        <el-tab-pane v-if="showFileTab" :label="fileTabLabel" name="files" />
      </el-tabs>

      <!-- 操作按钮区域 -->
      <div v-if="!viewMode" class="tab-actions">
        <el-space>
          <el-button type="danger" text @click="$emit('delete')" :icon="Delete" />
          <el-button type="primary" text @click="$emit('openSettings')" :icon="Setting" />
        </el-space>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="tab-content">
      <div v-show="activeTab === 'clipboard'" class="tab-pane">
        <slot name="clipboard" />
      </div>
      <div v-show="activeTab === 'files'" class="tab-pane">
        <slot name="files" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Delete, Setting } from '@element-plus/icons-vue'

const activeTab = defineModel<string>('activeTab', { required: true })

const props = defineProps<{
  fileTabLabel: string
  viewMode: boolean
  showFileTab: boolean
  showClipboardTab: boolean
}>()

defineEmits<{
  (e: 'delete'): void
  (e: 'openSettings'): void
}>()
</script>

<style scoped>
.tabs-container {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  overflow: hidden;
}

.tabs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
}

.tabs-clean {
  flex: 1;
  border: none;
}

:deep(.el-tabs__header) {
  padding: 0 20px;
  margin-bottom: 0;
  border-bottom: none;
}

:deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.tab-actions {
  flex-shrink: 0;
  padding: 0 20px;
}

.tab-content {
  padding: 20px;
}

.tab-pane {
  min-height: 200px;
}
</style>
