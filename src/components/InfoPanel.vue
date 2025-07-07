<template>
  <div class="info-panel card-style">
    <div class="panel-header">基本信息</div>
    <div class="info-grid">
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

      <!-- <div class="info-item">
        <span class="info-label">查看次数</span>
        <span class="info-value">{{ !appStore.keyword.id ? '-' : (appStore.keyword.view_count || 0) + '次' }}</span>
      </div> -->
    </div>
  </div>
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
.card-style {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.25rem; /* 20px */
  transition: border-color 0.5s, background-color 0.5s;
}

.panel-header {
  font-size: 1rem; /* 16px */
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--color-heading);
}

.info-grid {
  display: grid;
  gap: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem; /* 14px */
}

.info-label {
  color: var(--el-text-color-secondary);
}

.info-value {
  color: var(--el-text-color-primary);
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
}
</style>
