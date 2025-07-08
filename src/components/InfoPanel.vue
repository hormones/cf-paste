<template>
  <div class="info-panel card-style">
    <div class="panel-header">Basic Information</div>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Created</span>
        <span class="info-value">{{ formatDate(appStore.keyword.create_time) }}</span>
      </div>

      <div class="info-item">
        <span class="info-label">Updated</span>
        <span class="info-value">{{ formatDate(appStore.keyword.update_time) }}</span>
      </div>

      <!-- <div class="info-item">
        <span class="info-label">Last Viewed</span>
        <span class="info-value">{{ formatDate(appStore.keyword.last_view_time) }}</span>
      </div> -->

      <div class="info-item">
        <span class="info-label">Expires</span>
        <span class="info-value">{{ formatDate(appStore.keyword.expire_time) }}</span>
      </div>

      <!-- <div class="info-item">
        <span class="info-label">View Count</span>
        <span class="info-value">{{ !appStore.keyword.id ? '-' : (appStore.keyword.view_count || 0) + ' times' }}</span>
      </div> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores'

const appStore = useAppStore()

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
