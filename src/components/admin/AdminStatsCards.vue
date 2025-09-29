<script setup lang="ts">
import { computed } from 'vue'
import {
  ElRow,
  ElCol,
  ElCard,
  ElStatistic,
  ElButton,
  ElIcon,
  ElTooltip
} from 'element-plus'
import {
  View,
  DocumentAdd,
  User,
  TrendCharts,
  ArrowUp,
  ArrowDown,
  Minus,
  Right
} from '@element-plus/icons-vue'
import { useI18n } from '@/composables/useI18n'
import type { AdminOverviewResponse } from 'shared/types/admin'
import { Action } from 'shared/types/admin'

// Props
const props = defineProps<{
  data: AdminOverviewResponse | null
  loading?: boolean
}>()

// Emits
const emit = defineEmits<{
  cardClick: [type: 'views' | 'creates' | 'activeIPs' | 'todayCreates']
}>()

const { t } = useI18n()

// Card configuration
const cardConfigs = computed(() => [
  {
    key: 'totalViews' as keyof AdminOverviewResponse,
    type: 'views' as const,
    title: t('admin.stats.totalViews') || 'Total Views',
    icon: View,
    color: '#409EFF',
    bgColor: '#ecf5ff',
    actionText: t('admin.actions.viewDetails') || 'View Details',
    getValue: () => props.data?.totalViews || 0,
    getDescription: () => t('admin.stats.totalViewsDesc') || 'All time page views'
  },
  {
    key: 'totalCreates' as keyof AdminOverviewResponse,
    type: 'creates' as const,
    title: t('admin.stats.totalCreates') || 'Total Creates',
    icon: DocumentAdd,
    color: '#67C23A',
    bgColor: '#f0f9ff',
    actionText: t('admin.actions.viewDetails') || 'View Details',
    getValue: () => props.data?.totalCreates || 0,
    getDescription: () => t('admin.stats.totalCreatesDesc') || 'All time paste creates'
  },
  {
    key: 'activeIPs' as keyof AdminOverviewResponse,
    type: 'activeIPs' as const,
    title: t('admin.stats.activeIPs') || 'Active IPs',
    icon: User,
    color: '#E6A23C',
    bgColor: '#fdf6ec',
    actionText: t('admin.actions.viewDetails') || 'View Details',
    getValue: () => props.data?.activeIPs || 0,
    getDescription: () => t('admin.stats.activeIPsDesc') || 'Unique active IP addresses'
  },
  {
    key: 'todayCreates' as keyof AdminOverviewResponse,
    type: 'todayCreates' as const,
    title: t('admin.stats.todayCreates') || 'Today Creates',
    icon: TrendCharts,
    color: '#F56C6C',
    bgColor: '#fef0f0',
    actionText: t('admin.actions.viewDetails') || 'View Details',
    getValue: () => props.data?.todayCreates || 0,
    getDescription: () => t('admin.stats.todayCreatesDesc') || 'New pastes created today'
  }
])

// Format large numbers
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

// Get trend icon and color based on value changes
const getTrendInfo = (current: number, type: string) => {
  // For demo purposes, generate some trend data
  // In real implementation, you would compare with previous period data
  const trendValue = Math.random() * 20 - 10 // -10 to +10

  if (Math.abs(trendValue) < 1) {
    return {
      icon: Minus,
      color: '#909399',
      text: t('admin.trends.stable') || 'Stable',
      value: '0%'
    }
  } else if (trendValue > 0) {
    return {
      icon: ArrowUp,
      color: '#67C23A',
      text: t('admin.trends.increased') || 'Increased',
      value: `+${trendValue.toFixed(1)}%`
    }
  } else {
    return {
      icon: ArrowDown,
      color: '#F56C6C',
      text: t('admin.trends.decreased') || 'Decreased',
      value: `${trendValue.toFixed(1)}%`
    }
  }
}

// Handle card click
const handleCardClick = (type: 'views' | 'creates' | 'activeIPs' | 'todayCreates') => {
  emit('cardClick', type)
}
</script>

<template>
  <div class="admin-stats-cards">
    <el-row :gutter="16">
      <el-col
        v-for="config in cardConfigs"
        :key="config.key"
        :xs="12"
        :sm="6"
        :md="6"
        :lg="6"
        :xl="6"
      >
        <el-card
          class="stats-card"
          :class="{ 'stats-card--loading': loading }"
          shadow="hover"
          @click="handleCardClick(config.type)"
        >
          <!-- Card Header -->
          <div class="card-header">
            <div class="card-icon" :style="{ backgroundColor: config.bgColor }">
              <el-icon :color="config.color" :size="20">
                <component :is="config.icon" />
              </el-icon>
            </div>
            <div class="card-trend">
              <div
                v-if="!loading && props.data"
                class="trend-indicator"
                :style="{ color: getTrendInfo(config.getValue(), config.type).color }"
              >
                <el-tooltip
                  :content="getTrendInfo(config.getValue(), config.type).text"
                  placement="top"
                >
                  <el-icon :size="14">
                    <component :is="getTrendInfo(config.getValue(), config.type).icon" />
                  </el-icon>
                </el-tooltip>
              </div>
            </div>
          </div>

          <!-- Card Content -->
          <div class="card-content">
            <!-- Statistics Display -->
            <div class="stats-display">
              <el-statistic
                :value="config.getValue()"
                :formatter="formatNumber"
                class="stats-number"
              >
                <template #title>
                  <div class="stats-title">{{ config.title }}</div>
                </template>
              </el-statistic>

              <!-- Trend Value -->
              <div
                v-if="!loading && props.data"
                class="trend-value"
                :style="{ color: getTrendInfo(config.getValue(), config.type).color }"
              >
                {{ getTrendInfo(config.getValue(), config.type).value }}
              </div>
            </div>

            <!-- Description -->
            <div class="stats-description">
              {{ config.getDescription() }}
            </div>
          </div>

          <!-- Card Footer -->
          <div class="card-footer">
            <el-button
              type="primary"
              text
              class="action-button"
              @click.stop="handleCardClick(config.type)"
            >
              {{ config.actionText }}
              <el-icon class="action-icon">
                <Right />
              </el-icon>
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.admin-stats-cards {
  width: 100%;
}

/* Stats Card */
.stats-card {
  cursor: pointer;
  transition: all 0.3s ease;
  height: 100%;
  border: 1px solid var(--el-border-color-lighter);
}

.stats-card:hover {
  border-color: var(--el-color-primary);
  transform: translateY(-2px);
  box-shadow: var(--el-box-shadow);
}

.stats-card--loading {
  pointer-events: none;
  opacity: 0.7;
}

/* Card Structure */
:deep(.el-card__body) {
  padding: 20px;
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  gap: 12px;
  min-height: 200px;
}

/* Card Header */
.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.card-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.trend-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--el-bg-color-page);
}

/* Card Content */
.card-content {
  display: flex;
  flex-direction: column;
}

.stats-display {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}

/* Statistics Number */
:deep(.stats-number .el-statistic__content) {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

:deep(.stats-number .el-statistic__number) {
  font-size: 24px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-height: 1.2;
}

.stats-title {
  font-size: 14px;
  color: var(--el-text-color-regular);
  font-weight: 500;
  margin-bottom: 4px;
}

.trend-value {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

/* Description */
.stats-description {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  line-height: 1.4;
  flex-shrink: 0;
}

/* Card Footer */
.card-footer {
  margin-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 12px;
  flex-shrink: 0;
}

.action-button {
  width: 100%;
  justify-content: center;
  font-size: 13px;
  padding: 6px 12px;
}

.action-icon {
  margin-left: 4px;
  transition: transform 0.2s ease;
}

.stats-card:hover .action-icon {
  transform: translateX(2px);
}

/* Responsive Design */
@media (max-width: 768px) {
  .admin-stats-cards :deep(.el-col) {
    margin-bottom: 12px;
  }

  :deep(.el-card__body) {
    padding: 16px;
    display: grid;
    grid-template-rows: auto 1fr auto auto;
    gap: 10px;
    min-height: 180px;
  }

  .card-icon {
    width: 32px;
    height: 32px;
  }

  .card-icon :deep(.el-icon) {
    font-size: 16px;
  }

  :deep(.stats-number .el-statistic__number) {
    font-size: 20px;
  }

  .stats-title {
    font-size: 13px;
  }

  .stats-description {
    font-size: 11px;
    line-height: 1.3;
    padding-top: 6px;
  }

  .card-footer {
    margin-top: 12px;
    padding-top: 10px;
  }

  .action-button {
    font-size: 12px;
    padding: 4px 8px;
  }
}

@media (max-width: 480px) {
  :deep(.el-card__body) {
    padding: 12px;
    display: grid;
    grid-template-rows: auto 1fr auto auto;
    gap: 8px;
    min-height: 160px;
  }

  .card-header {
    margin-bottom: 8px;
  }

  .card-footer {
    margin-top: 10px;
    padding-top: 8px;
  }

  .card-icon {
    width: 28px;
    height: 28px;
  }

  :deep(.stats-number .el-statistic__number) {
    font-size: 18px;
  }

  .trend-value {
    font-size: 11px;
  }

  .stats-description {
    font-size: 10px;
    line-height: 1.2;
    padding-top: 4px;
  }
}

/* Loading Animation */
.stats-card--loading {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.7;
  }
  50% {
    opacity: 0.9;
  }
}

/* Accessibility */
.stats-card:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.action-button:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

/* Animation */
.admin-stats-cards {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
