<template>
  <!-- Upload progress card - uses simple styling without changing borders -->
  <el-card class="upload-progress-card" shadow="never">
    <div class="upload-progress-container">
      <div
        v-for="[fileName, state] in appStore.uploadStates"
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
            <div class="progress-left">
              <el-tag :type="getTagType(state.status)" size="small" effect="light" round>
                {{ getStatusText(state.status) }}
              </el-tag>
                        <el-text v-if="state.status === 'error'" size="small" type="danger">
            {{ state.error || t('common.msg.uploadFailed') }}
          </el-text>
            </div>

            <!-- Upload speed and remaining time display -->
            <div v-if="state.status === 'uploading'" class="progress-stats">
              <el-text size="small" type="info">
                {{ formatUploadSpeed(state.uploadSpeed || 0) }}
              </el-text>
                          <el-text size="small" type="info">
              {{
                formatRemainingTime(state.remainingTime || 0)
                  ? t('common.time.remaining', { time: formatRemainingTime(state.remainingTime || 0) })
                  : t('common.time.calculating')
              }}
            </el-text>
            </div>
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
            {{ t('common.buttons.retry') }}
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
            {{ t('common.buttons.cancel') }}
          </el-button>
          <el-button
            v-if="state.status === 'completed' || state.status === 'error'"
            size="small"
            round
            @click="$emit('dismiss', fileName)"
          >
            {{ t('common.buttons.close') }}
          </el-button>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Document } from '@element-plus/icons-vue'
import { Utils, formatUploadSpeed, formatRemainingTime } from '@/utils'
import { useAppStore } from '@/stores'
import { useI18n } from '@/composables/useI18n'

interface Emits {
  (e: 'retry', fileName: string): void
  (e: 'cancel', fileName: string): void
  (e: 'dismiss', fileName: string): void
}

const appStore = useAppStore()
const { t } = useI18n()

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
      return t('common.states.uploading')
    case 'completed':
      return t('common.states.completed')
    case 'error':
      return t('common.states.failed')
    default:
      return t('common.states.waiting')
  }
}
</script>

<style scoped>
.upload-progress-card {
  /* Remove borders and background, use container's dashed border */
  border: none;
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

.progress-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'JetBrains Mono', Monaco, 'Courier New', monospace;
}

.item-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  min-height: 32px; /* Reserve space to prevent layout shift */
}
</style>
