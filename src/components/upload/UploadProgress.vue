<template>
  <!-- 上传进度蒙层 - 覆盖上传区域 -->
  <div
    v-if="uploadStates.size > 0"
    class="upload-overlay"
  >
    <div class="upload-progress-container">
      <div
        v-for="[fileName, state] in uploadStates"
        :key="fileName"
        class="upload-item"
      >
        <div class="item-header">
          <span class="file-name">
            <el-icon :size="20"><Document /></el-icon>
            <span>{{ fileName }}</span>
          </span>
          <el-text size="small" type="info">
            {{ Utils.humanReadableSize(state.currentFile?.size || 0) }}
          </el-text>
        </div>

        <div class="item-body">
          <el-progress
            :percentage="state.progress?.percentage || (state.status === 'completed' ? 100 : 0)"
            :stroke-width="20"
            :status="getProgressStatus(state.status)"
            :text-inside="true"
            striped
            striped-flow
          />
          <div class="progress-details">
            <el-tag :type="getTagType(state.status)" size="small" effect="light" round>
              {{ getStatusText(state.status) }}
            </el-tag>
            <el-text v-if="state.status === 'uploading' && state.progress && state.progress.speed > 0" size="small" type="success">
              {{ formatSpeed(state.progress.speed) }} | 剩余 {{ formatTime(state.progress.remainingTime) }}
            </el-text>
            <el-text v-if="state.status === 'error'" size="small" type="danger">
              {{ state.error || '上传失败' }}
            </el-text>
          </div>
        </div>

        <div class="item-footer">
          <el-button
            v-if="state.status === 'error'"
            type="primary"
            size="small"
            round
            @click="$emit('retry', fileName)"
          >
            重试
          </el-button>
          <el-button
            v-if="state.canCancel && state.status === 'uploading'"
            type="danger"
            size="small"
            text
            bg
            round
            @click="$emit('cancel', fileName)"
          >
            取消
          </el-button>
          <el-button
            v-if="state.status === 'completed' || state.status === 'error'"
            size="small"
            round
            @click="$emit('dismiss', fileName)"
          >
            关闭
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Document } from '@element-plus/icons-vue'
import type { UploadState } from '@/composables/useFileUpload'
import { Utils } from '@/utils'

interface Props {
  uploadStates: Map<string, UploadState>
}

interface Emits {
  (e: 'retry', fileName: string): void
  (e: 'cancel', fileName: string): void
  (e: 'dismiss', fileName: string): void
}

defineProps<Props>()
defineEmits<Emits>()

const getProgressStatus = (status: string) => {
  if (status === 'error') return 'exception'
  if (status === 'completed') return 'success'
  return undefined // for 'uploading'
}

const getTagType = (status: string) => {
  switch (status) {
    case 'uploading':
      return 'primary'
    case 'completed':
      return 'success'
    case 'error':
      return 'danger'
    default:
      return 'info'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'uploading':
      return '上传中'
    case 'completed':
      return '已完成'
    case 'error':
      return '失败'
    default:
      return '等待'
  }
}

const formatSpeed = (bytesPerSecond: number): string => {
  if (bytesPerSecond === 0) return ''
  if (bytesPerSecond < 1024) {
    return `${bytesPerSecond.toFixed(0)} B/s`
  } else if (bytesPerSecond < 1024 * 1024) {
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
  } else {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
  }
}

const formatTime = (seconds: number): string => {
  if (seconds === Infinity || seconds === 0) return '0秒'
  if (seconds < 60) {
    return `${Math.ceil(seconds)}秒`
  } else if (seconds < 3600) {
    return `${Math.ceil(seconds / 60)}分钟`
  } else {
    return `${Math.ceil(seconds / 3600)}小时`
  }
}
</script>

<style scoped>
.upload-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  padding: 20px;
}

.upload-progress-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.upload-item {
  width: 100%;
  max-width: 500px;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.file-name {
  font-weight: 500;
  font-size: 16px;
  color: var(--el-text-color-primary);
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-body {
  margin-bottom: 20px;
}

.progress-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding: 0 2px;
}

.item-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  height: 32px; /* Reserve space to prevent layout shift */
}
</style>
