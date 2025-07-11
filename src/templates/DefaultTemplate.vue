<script setup lang="ts">
import { onMounted } from 'vue'

// Component imports
import PageHeader from '@/components/PageHeader.vue'
import PasswordDialog from '@/components/PasswordDialog.vue'
import TabsContainer from '@/components/TabsContainer.vue'
import InfoPanel from '@/components/InfoPanel.vue'
import QRCodePanel from '@/components/QRCodePanel.vue'
import SettingsDialog from '@/components/SettingsDialog.vue'

// Store and Composable imports
import { useAppStore } from '@/stores'
import { useMain } from '@/composables/useMain'
import { useFileUpload } from '@/composables/useFileUpload'
import { useI18n } from '@/i18n'

// Store and Composables
const appStore = useAppStore()

// Business logic Composables
const { fetchKeyword } = useMain()
const { fetchConfig, fetchFileList } = useFileUpload()
const { initializeLanguage } = useI18n()

// Event handlers

onMounted(async () => {
  // Initialize configuration
  await fetchConfig()

  // Initialize language after config is loaded
  initializeLanguage()

  // Load content
  const keywordData = await fetchKeyword()
  // If keyword exists, load file list
  if (keywordData) {
    await fetchFileList()
  }
})
</script>

<template>
  <div class="paste-container">
    <PageHeader />

    <div class="main-layout">
      <TabsContainer class="content-area" />
      <div v-if="!appStore.viewMode" class="side-panel">
        <InfoPanel />
        <QRCodePanel />
      </div>
    </div>

    <PasswordDialog v-model:visible="appStore.showPasswordDialog" />

    <SettingsDialog />

    <!-- Dialog for displaying QR code, also uses ElDialog -->
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
  display: flex;
  flex-direction: column;
  padding: 20px;
  max-width: 1400px;
  height: 100vh;
  margin: 0 auto;
  box-sizing: border-box;
}

.main-layout {
  flex: 1;
  display: flex;
  gap: 20px;
  overflow: hidden;
  min-height: 0;
}

/* 内容区域 */
.content-area {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  height: 95%;
}

.side-panel {
  flex: 0 0 320px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 0;
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

@media (max-width: 992px) {
  .side-panel {
    display: none;
  }
}
</style>

<style>
/* Global styles for QR code popup, remove default padding and make background transparent */
.qr-code-dialog .el-dialog__body {
  padding: 0;
}
.qr-code-dialog {
  background: transparent;
  box-shadow: none;
}
</style>
