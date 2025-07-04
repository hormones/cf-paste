<template>
  <el-card class="info-card" shadow="never">
    <template #header>
      <el-text tag="b" class="card-title">基本信息</el-text>
    </template>

    <div class="info-content">
      <div class="info-item">
        <span class="info-label">创建时间</span>
        <span class="info-value">{{ formatDate(appStore.keyword.create_time) }}</span>
      </div>

      <div class="info-item">
        <span class="info-label">更新时间</span>
        <span class="info-value">{{ formatDate(appStore.keyword.update_time) }}</span>
      </div>

      <div class="info-item">
        <span class="info-label">上次查看</span>
        <span class="info-value">{{ formatDate(appStore.keyword.last_view_time) }}</span>
      </div>

      <div class="info-item">
        <span class="info-label">过期时间</span>
        <span class="info-value">{{ formatDate(appStore.keyword.expire_time) }}</span>
      </div>

      <div class="info-item">
        <span class="info-label">查看次数</span>
        <span class="info-value">{{ !appStore.keyword.id ? '-' : (appStore.keyword.view_count || 0) + '次' }}</span>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores'

const appStore = useAppStore()

/**
 * 格式化时间戳为可读的日期时间字符串
 */
const formatDate = (timestamp?: number): string => {
  if (!timestamp) {
    return '-'
  }
  return new Date(timestamp).toLocaleString()
}
</script>

<style scoped>
.info-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.card-title {
  font-size: 14px;
}

.info-content {
  display: flex;
  flex-direction: column;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  transition: background-color 0.2s ease;
}

.info-item:hover {
  background-color: var(--el-fill-color-lighter);
  margin: 0 -12px;
  padding: 14px 12px;
  border-radius: 6px;
  border-bottom: 1px solid transparent;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  font-weight: 400;
  min-width: 80px;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 14px;
  color: var(--el-text-color-primary);
  font-weight: 500;
  text-align: right;
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
}
</style>
