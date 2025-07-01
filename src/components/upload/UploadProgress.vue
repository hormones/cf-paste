<template>
  <!-- 上传进度卡片 - 使用简洁样式，不改变边框 -->
  <el-card class="upload-progress-card" shadow="never">
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
            :percentage="state.progress || (state.status === 'completed' ? 100 : 0)"
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
            v-if="state.cancel && state.status === 'uploading'"
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
  </el-card>
</template>

<script setup lang="ts">
import { Document } from '@element-plus/icons-vue'
import type { UploadState } from '@/types'
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
</script>

<style scoped>
.upload-progress-card {
  /* 移除边框和背景，使用容器的虚线边框 */
  border: none;
  background: transparent;
  box-shadow: none;
}

.upload-progress-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
}

.upload-item {
  width: 100%;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
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
  flex: 1;
}

.item-body {
  margin-bottom: 15px;
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
  min-height: 32px; /* Reserve space to prevent layout shift */
}
</style>
