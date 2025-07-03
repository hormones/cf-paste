<template>
  <div class="tabs-container">
    <!-- 顶部操作栏 -->
    <div class="tabs-header">
      <el-tabs v-model="activeTab" class="layout-container tabs-clean">
        <el-tab-pane label="剪贴板" name="clipboard" />
        <el-tab-pane label="文件" name="files" />
      </el-tabs>

      <!-- 操作按钮区域 -->
      <div class="tab-actions" v-if="!appStore.viewMode">
        <el-button-group>
          <el-button type="danger" @click="handleDelete" :icon="Delete" text />
          <el-button type="primary" @click="openSettings" :icon="Setting" text />
        </el-button-group>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="tab-content">
      <div v-show="activeTab === 'clipboard'" class="tab-pane">
        <ClipboardPanel v-model="appStore.keyword.content" @auto-save="saveKeyword" />
      </div>
      <div v-show="activeTab === 'files'" class="layout-flex">
        <FileUploadPanel v-if="!appStore.viewMode" />
        <FileTable />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Delete, Setting } from '@element-plus/icons-vue'
import { ref } from 'vue'
import { useAppStore } from '@/stores'
import { useMain } from '@/composables/useMain'
import { useSettings } from '@/composables/useSettings'
import { ElMessageBox } from 'element-plus'

const activeTab = ref('clipboard')
const appStore = useAppStore()
const { saveKeyword, deleteKeyword } = useMain()
const { openSettings } = useSettings()


const handleDelete = async () => {
  try {
    await ElMessageBox.confirm('确定要删除所有内容吗？此操作将删除剪贴板内容和所有文件。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteKeyword()
  } catch (error) {
    // 用户取消操作时，ElMessageBox会抛出 'cancel'，这里无需处理
  }
}
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

/* 优化标签样式 - 保持简洁但更大气 */
:deep(.el-tabs__item) {
  padding: 18px 28px !important;
  font-size: 17px !important;
  height: auto !important;
  line-height: 1.5 !important;
}

:deep(.el-tabs__item:hover) {
  color: var(--el-color-primary) !important;
}

:deep(.el-tabs__item.is-active) {
  color: var(--el-color-primary) !important;
  font-weight: 600 !important;
}

.tab-actions {
  flex-shrink: 0;
  padding: 0 20px;
}

.tab-content {
  padding: 20px;
}

.tab-pane {
  min-height: 400px;
}

.layout-flex {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
