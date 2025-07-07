<script setup lang="ts">
import { onMounted } from 'vue'

// 组件导入
import PageHeader from '@/components/PageHeader.vue'
import PasswordDialog from '@/components/PasswordDialog.vue'
import TabsContainer from '@/components/TabsContainer.vue'
import InfoPanel from '@/components/InfoPanel.vue'
import QRCodePanel from '@/components/QRCodePanel.vue'
import SettingsDialog from '@/components/SettingsDialog.vue'

// Store 和 Composable 导入
import { useAppStore } from '@/stores'
import { useMain } from '@/composables/useMain'
import { useFileUpload } from '@/composables/useFileUpload'

// ===================
// Store 和 Composables
// ===================
const appStore = useAppStore()

// 业务逻辑 Composables
const { fetchKeyword } = useMain()

const { fetchConfig, fetchFileList } = useFileUpload()

// ===================
// 事件处理函数
// ===================

onMounted(async () => {
  // 初始化配置
  await fetchConfig()

  // 加载内容
  const keywordData = await fetchKeyword()
  // 如果存在keyword，才加载文件列表
  if (keywordData) {
    await fetchFileList()
  }

  // 设置全局 viewMode
  appStore.viewMode = !appStore.keyword.word
})
</script>

<template>
  <div class="paste-container">
    <PageHeader />

    <!-- 使用 el-row/el-col 替代自定义布局 -->
    <el-row :gutter="20" class="main-layout">
      <el-col
        :span="appStore.viewMode ? 24 : 16"
        :xs="24"
        :sm="24"
        :md="appStore.viewMode ? 24 : 16"
      >
        <TabsContainer />
      </el-col>
      <el-col :span="8" :xs="0" :sm="0" :md="8" v-if="!appStore.viewMode">
        <div class="side-panel">
          <InfoPanel />
          <QRCodePanel />
        </div>
      </el-col>
    </el-row>

    <PasswordDialog v-model:visible="appStore.showPasswordDialog" />

    <SettingsDialog />

    <!-- 用于显示二维码的对话框，同样使用 ElDialog -->
    <el-dialog
      v-model="appStore.showQRCodeDialog"
      width="360px"
      :show-header="false"
      :append-to-body="true"
      :show-close="false"
      custom-class="qr-code-dialog"
    >
      <QRCodePanel />
    </el-dialog>
  </div>
</template>

<style scoped>
.paste-container {
  /* 容器样式 */
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  /* 使用 body 的背景色，这里不需要额外设置 */
}

/* 主要布局使用Element Plus的el-row/el-col，无需自定义样式 */
.main-layout {
  max-width: 1400px;
  margin: 0 auto;
}

/* 侧边栏样式 - 为基本信息和只读链接添加间距 */
.side-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.setting-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label span {
  font-size: 15px;
  color: var(--el-text-color-primary);
}

.setting-label small {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>

<style>
/* 针对二维码弹窗的全局样式，移除默认内边距并使其背景透明 */
.qr-code-dialog .el-dialog__body {
  padding: 0;
}
.qr-code-dialog {
  background: transparent;
  box-shadow: none;
}
</style>
