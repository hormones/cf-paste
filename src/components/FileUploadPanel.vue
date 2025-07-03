<template>
  <!-- 上传区域容器 - 添加相对定位和统一的虚线边框 -->
  <div class="upload-panel-container">
    <!-- 上传卡片：始终在底层 -->
    <el-card class="layout-item upload-card" shadow="never">
      <el-upload
        :http-request="handleUpload"
        :disabled="!appStore.canUpload"
        :show-file-list="false"
        drag
        class="upload-dragger"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
      </el-upload>
    </el-card>

    <!-- 上传进度：当有上传任务时，通过绝对定位覆盖在上方 -->
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

const emit = defineEmits<{
  (e: 'upload-success'): void
}>()

const appStore = useAppStore()
const { uploadFile } = useFileUpload()

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
  const state = appStore.uploadStates.get(fileName)
  if (state?.currentFile) {
    await handleUpload({ file: state.currentFile })
  }
}

/**
 * 取消上传
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
  min-height: 230px; /* 增加最小高度以容纳进度条 */
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  transition: border-color 0.3s ease;
  display: flex; /* 使用flex布局让子元素撑满 */
  align-items: center; /* 垂直居中 */
  justify-content: center; /* 水平居中 */
}

.upload-panel-container:hover {
  border-color: var(--el-color-primary);
}

.upload-card {
  border: none;
  background: transparent;
  box-shadow: none;
  width: 100%; /* 确保卡片撑满容器 */
}

/* 覆盖 Element Plus 的默认卡片样式 */
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
  border: none; /* 移除内部边框 */
  background: transparent; /* 移除内部背景 */
}

.upload-progress-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #ffffff; /* 使用浅色背景覆盖 */
  z-index: 10;
  border-radius: 8px;
  overflow-y: auto; /* 如果内容过多则滚动 */
}
</style>
