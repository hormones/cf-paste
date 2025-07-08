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

// Store and Composables
const appStore = useAppStore()

// Business logic Composables
const { fetchKeyword } = useMain()

const { fetchConfig, fetchFileList } = useFileUpload()

// Event handlers

onMounted(async () => {
  // Initialize configuration
  await fetchConfig()

  // Load content
  const keywordData = await fetchKeyword()
  // If keyword exists, load file list
  if (keywordData) {
    await fetchFileList()
  }

  // Set global viewMode
  appStore.viewMode = !appStore.keyword.word
})
</script>

<template>
  <div class="paste-container">
    <PageHeader />

    <!-- Use el-row/el-col to replace custom layout -->
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
  /* Container styles */
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  /* Use body background color, no need to set additional background here */
}

/* Main layout uses Element Plus el-row/el-col, no need for custom styles */
.main-layout {
  max-width: 1400px;
  margin: 0 auto;
}

/* Sidebar styles - add spacing between basic info and read-only link */
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
/* Global styles for QR code popup, remove default padding and make background transparent */
.qr-code-dialog .el-dialog__body {
  padding: 0;
}
.qr-code-dialog {
  background: transparent;
  box-shadow: none;
}
</style>
