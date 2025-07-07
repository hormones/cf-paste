<template>
  <div class="tabs-container">
    <!-- 顶部操作栏 -->
    <div class="tabs-header">
      <el-tabs v-model="activeTab" class="layout-container tabs-clean">
        <el-tab-pane label="剪贴板" name="clipboard" />
        <el-tab-pane :label="appStore.fileTabLabel" name="files" />
      </el-tabs>

      <!-- 操作按钮区域 -->
      <!-- <div class="tab-actions" v-if="!appStore.viewMode">
        <el-button-group>
          <el-button type="danger" @click="handleDelete" :icon="Delete" text />
          <el-button type="primary" @click="openSettings" :icon="Setting" text />
          <el-button
            type="primary"
            @click="appStore.setShowQRCodeDialog(true)"
            :icon="InfoFilled"
            text
            v-show="!appStore.viewMode && appStore.keyword.id"
            class="mobile-info-btn"
          />
        </el-button-group>
      </div> -->
    </div>

    <!-- 内容区域 -->
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
import { ref } from 'vue'
import { useAppStore } from '@/stores'
import { useMain } from '@/composables/useMain'

const activeTab = ref('clipboard')
const appStore = useAppStore()
const { saveKeyword } = useMain()

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
  overflow: hidden; /* 防止子元素溢出圆角 */
}

.tabs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  flex-grow: 1;
  min-height: 0; /*  新增：允许 flex 子元素收缩 */
}

.tabs-clean {
  --el-tabs-header-height: 40px;
}

/* 覆盖 Element Plus 的样式 */
:deep(.el-tabs__header) {
  margin-bottom: 0;
}
:deep(.el-tabs__nav-wrap::after) {
  display: none; /* 移除底部分割线 */
}
:deep(.el-tabs__item) {
  padding: 0 16px; /* 减小内边距 */
}
:deep(.el-tabs__item.is-active) {
  color: var(--el-color-primary); /* 保持激活状态的品牌色 */
}

.tab-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0; /* 防止按钮组被压缩 */
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

/* 移动端样式 */
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
