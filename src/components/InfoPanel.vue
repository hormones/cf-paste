<template>
  <div class="info-panel card-style">
    <div class="panel-header">{{ t('clipboard.info.title') }}</div>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">{{ t('clipboard.info.created') }}</span>
        <span class="info-value">{{ formatDate(appStore.keyword.create_time) }}</span>
      </div>

      <div class="info-item">
        <span class="info-label">{{ t('clipboard.info.updated') }}</span>
        <span class="info-value">{{ formatDate(appStore.keyword.update_time) }}</span>
      </div>

      <!-- <div class="info-item">
        <span class="info-label">Last Viewed</span>
        <span class="info-value">{{ formatDate(appStore.keyword.last_view_time) }}</span>
      </div> -->

      <div class="info-item">
        <span class="info-label">{{ t('clipboard.info.expires') }}</span>
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
import { useI18n } from '@/composables/useI18n'

const appStore = useAppStore()
const { t } = useI18n()

const formatDate = (timestamp?: number): string => {
  if (!timestamp) {
    return t('common.placeholders.emptyValue')
  }
  return new Date(timestamp).toLocaleString()
}
</script>

<style scoped>
.card-style {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.25rem;
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
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.info-value {
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
}
</style>
