<template>
  <!-- 上传区域容器 - 添加相对定位和统一的虚线边框 -->
  <div class="upload-panel-container">
    <!-- 上传卡片：当没有上传任务时显示 -->
    <el-card v-if="uploadStates.size === 0" class="layout-item upload-card" shadow="never">
      <el-upload
        :http-request="handleUpload"
        :disabled="!canUpload"
        drag
        class="upload-dragger"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
      </el-upload>
    </el-card>

    <!-- 上传进度：当有上传任务时显示，只覆盖上传卡片区域 -->
    <UploadProgress
      v-else
      class="layout-item"
      :upload-states="uploadStates"
      @retry="handleRetry"
      @cancel="handleCancelUpload"
      @dismiss="handleDismissUpload"
    />
  </div>
</template>

<script setup lang="ts">
import { UploadFilled } from '@element-plus/icons-vue'
import UploadProgress from './upload/UploadProgress.vue'
import { useFileUpload } from '@/composables/useFileUpload'

const emit = defineEmits<{
  (e: 'upload-success'): void
}>()

// 直接从正确的 Composable 获取功能
const { uploadStates, canUpload, uploadFile, removeUploadState } = useFileUpload()

// 内部处理上传逻辑
const handleUpload = async (options: any) => {
  try {
    await uploadFile(options.file as File)
    emit('upload-success')
  } catch (error) {
    console.error('文件上传失败:', error)
  }
}

const handleRetry = async (fileName: string) => {
  const state = uploadStates.value.get(fileName)
  if (state?.currentFile) {
    await handleUpload({ file: state.currentFile })
  }
}

/**
 * 取消上传
 */
const handleCancelUpload = (fileName: string) => {
  const state = uploadStates.value.get(fileName)
  if (state?.cancel) {
    state.cancel()
  } else {
    removeUploadState(fileName)
  }
}

/**
 * 手动关闭上传进度显示
 */
const handleDismissUpload = (fileName: string) => {
  removeUploadState(fileName)
}
</script>

<style scoped>
.upload-panel-container {
  position: relative;
  min-height: 180px;
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  transition: border-color 0.3s ease;
}

.upload-panel-container:hover {
  border-color: var(--el-color-primary);
}

.upload-card {
  /* 移除卡片的边框，使用容器的虚线边框 */
  border: none;
  background: transparent;
  box-shadow: none;
}

/* 覆盖 Element Plus 的默认卡片样式 */
.upload-card :deep(.el-card__body) {
  padding: 40px 20px;
}
</style>
