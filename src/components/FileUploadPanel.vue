<template>
  <!-- Upload area container - adds relative positioning and unified dashed border -->
  <div class="upload-panel-container">
    <!-- Upload card: always at the bottom layer -->
    <el-card class="layout-item upload-card" shadow="never">
      <el-upload
        :http-request="handleUpload"
        :disabled="!appStore.canUpload"
        :show-file-list="false"
        drag
        class="upload-dragger"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">{{ t('file.dragHint') }}</div>
      </el-upload>
    </el-card>

    <!-- Upload progress: when there are upload tasks, overlay on top with absolute positioning -->
    <UploadProgress
      v-if="appStore.uploadStates.size > 0"
      class="upload-progress-overlay"
      @retry="handleRetry"
      @cancel="handleCancelUpload"
      @dismiss="appStore.removeUploadState"
    />
  </div>
</template>

<script setup lang="ts">
import { UploadFilled } from '@element-plus/icons-vue'
import UploadProgress from './UploadProgress.vue'
import { useFileUpload } from '@/composables/useFileUpload'
import { useAppStore } from '@/stores'
import { useI18nComposable } from '@/composables/useI18n'

const emit = defineEmits<{
  (e: 'upload-success'): void
}>()

const appStore = useAppStore()
const { uploadFile } = useFileUpload()
const { t } = useI18nComposable()

// Internal upload logic handling
const handleUpload = async (options: any) => {
  try {
    await uploadFile(options.file as File)
    emit('upload-success')
  } catch (error) {
    console.error('File upload failed:', error)
  }
}

const handleRetry = async (fileName: string) => {
  const state = appStore.uploadStates.get(fileName)
  if (state?.currentFile) {
    await handleUpload({ file: state.currentFile })
  }
}

/**
 * Cancel upload
 */
const handleCancelUpload = (fileName: string) => {
  const state = appStore.uploadStates.get(fileName)
  if (state?.cancel) {
    state.cancel()
  } else {
    appStore.removeUploadState(fileName)
  }
}
</script>

<style scoped>
.upload-panel-container {
  position: relative;
  min-height: 230px; /* Increase minimum height to accommodate progress bar */
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  transition: border-color 0.3s ease;
  display: flex; /* Use flex layout to make child elements fill */
  align-items: center; /* Vertical center */
  justify-content: center; /* Horizontal center */
}

.upload-panel-container:hover {
  border-color: var(--el-color-primary);
}

.upload-card {
  border: none;
  background: transparent;
  box-shadow: none;
  width: 100%; /* Ensure card fills container */
}

/* Override Element Plus default card styles */
.upload-card :deep(.el-card__body) {
  padding: 0;
  height: 100%;
  display: flex;
}

.upload-dragger {
  width: 100%;
}

.upload-dragger :deep(.el-upload-dragger) {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  border: none; /* Remove internal border */
  background: transparent; /* Remove internal background */
}

.upload-progress-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--color-surface); /* Use theme surface color overlay */
  z-index: 10;
  border-radius: 8px;
  overflow-y: auto; /* Scroll if content is too much */
}
</style>
