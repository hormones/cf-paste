<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import {
  ElRow,
  ElCol,
  ElDatePicker,
  ElButton,
  ElTooltip,
  ElSpace,
  ElDivider,
  ElSkeleton,
  ElAlert
} from 'element-plus'
import { Refresh, Calendar, TrendCharts } from '@element-plus/icons-vue'
import { useAdminStore } from '@/stores/admin'
import { adminApi } from '@/api/admin'
import { useI18n } from '@/composables/useI18n'
import type {
  AdminOverviewResponse,
  AdminActivityDataPoint,
  AdminRankingResponse
} from 'shared/types/admin'
import { Action } from 'shared/types/admin'

// Components
import AdminStatsCards from './AdminStatsCards.vue'
import AdminActivityChart from './AdminActivityChart.vue'
import AdminTopRankings from './AdminTopRankings.vue'

const { t } = useI18n()
const adminStore = useAdminStore()
const { filters, loading } = storeToRefs(adminStore)

// Local state
const overviewData = ref<AdminOverviewResponse | null>(null)
const activityData = ref<AdminActivityDataPoint[]>([])
const rankingData = ref<AdminRankingResponse | null>(null)
const error = ref('')
const autoRefreshTimer = ref<number | null>(null)

// Date range shortcuts
const shortcuts = [
  {
    text: t('admin.dateRange.today') || 'Today',
    value: () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const endOfDay = new Date(today)
      endOfDay.setHours(23, 59, 59, 999)
      return [today, endOfDay]
    }
  },
  {
    text: t('admin.dateRange.yesterday') || 'Yesterday',
    value: () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)
      const endOfYesterday = new Date(yesterday)
      endOfYesterday.setHours(23, 59, 59, 999)
      return [yesterday, endOfYesterday]
    }
  },
  {
    text: t('admin.dateRange.last7Days') || 'Last 7 days',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    }
  },
  {
    text: t('admin.dateRange.last30Days') || 'Last 30 days',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    }
  },
  {
    text: t('admin.dateRange.thisMonth') || 'This month',
    value: () => {
      const start = new Date()
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      return [start, end]
    }
  }
]

// Computed time range for display
const timeRangeText = computed(() => {
  if (!filters.value.timeRange) {
    return t('admin.dateRange.allTime') || 'All Time'
  }

  const [start, end] = filters.value.timeRange
  const startDate = new Date(start).toLocaleDateString()
  const endDate = new Date(end).toLocaleDateString()

  if (startDate === endDate) {
    return startDate
  }

  return `${startDate} - ${endDate}`
})

// Handle time range change
const handleTimeRangeChange = (range: [Date, Date] | null) => {
  if (range) {
    adminStore.updateFilters({
      timeRange: [range[0].getTime(), range[1].getTime()]
    })
  } else {
    adminStore.updateFilters({
      timeRange: undefined
    })
  }

  // Auto refresh data when time range changes
  refreshData()
}

// Fetch all overview data
const fetchOverviewData = async () => {
  try {
    error.value = ''

    const timeParams = adminStore.getTimeRangeParams()

    // 前置调用 overview 接口
    adminStore.setLoading('overview', true)
    const overviewResult = await adminApi.getOverview(timeParams)
    overviewData.value = overviewResult
    adminStore.setLoading('overview', false)

    // 并行获取其他数据
    adminStore.setLoading('activity', true)
    adminStore.setLoading('ranking', true)

    const [activityResult, rankingResult] = await Promise.all([
      adminApi.getActivity({
        ...timeParams,
        granularity: 'day'
      }),
      adminApi.getRanking(timeParams)
    ])

    // Update remaining data
    activityData.value = activityResult.data || []
    rankingData.value = rankingResult

  } catch (err: any) {
    console.error('Failed to fetch overview data:', err)
    error.value = err?.message || t('admin.errors.fetchFailed') || 'Failed to fetch data'
  } finally {
    adminStore.setLoading('overview', false)
    adminStore.setLoading('activity', false)
    adminStore.setLoading('ranking', false)
  }
}

// Load data (简化为直接获取数据)
const loadData = async () => {
  await fetchOverviewData()
}

// Refresh data (重新获取数据)
const refreshData = async () => {
  await fetchOverviewData()
}

// Auto refresh functionality
const startAutoRefresh = () => {
  // Refresh every 5 minutes
  autoRefreshTimer.value = window.setInterval(() => {
    refreshData()
  }, 5 * 60 * 1000)
}

const stopAutoRefresh = () => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
    autoRefreshTimer.value = null
  }
}

// Handle stats card click - jump to logs tab with filter
const handleStatsCardClick = (type: 'views' | 'creates' | 'activeIPs' | 'todayCreates') => {
  // Switch to logs tab
  adminStore.setCurrentTab('logs')

  // Set appropriate filter based on card type
  switch (type) {
    case 'views':
      adminStore.updateFilters({
        logPage: 1,
        action: Action.VIEW
      })
      break
    case 'creates':
      adminStore.updateFilters({
        logPage: 1,
        action: Action.CREATE
      })
      break
    case 'activeIPs':
      adminStore.updateFilters({
        logPage: 1
        // No specific action filter for IPs
      })
      break
    case 'todayCreates':
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const endOfDay = new Date(today)
      endOfDay.setHours(23, 59, 59, 999)

      adminStore.updateFilters({
        timeRange: [today.getTime(), endOfDay.getTime()],
        logPage: 1,
        action: Action.CREATE
      })
      break
  }
}

// Handle chart drill down - jump to logs tab with specific time and action filter
const handleChartDrillDown = (bucket: string, metric: string) => {
  // Switch to logs tab
  adminStore.setCurrentTab('logs')

  // Parse bucket time and set time range filter
  try {
    const date = new Date(bucket)
    if (!isNaN(date.getTime())) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      // Map metric to action
      const metricToAction: Record<string, Action> = {
        'create': Action.CREATE,
        'update': Action.UPDATE_CONTENT,
        'delete': Action.DELETE,
        'view': Action.VIEW
      }

      const filters: any = {
        timeRange: [startOfDay.getTime(), endOfDay.getTime()],
        logPage: 1
      }

      // Add action filter if metric matches
      if (metricToAction[metric]) {
        filters.action = metricToAction[metric]
      }

      adminStore.updateFilters(filters)
    }
  } catch (error) {
    console.error('Failed to parse bucket date:', error)
    // Fallback: just switch to logs tab without time filter
    adminStore.updateFilters({
      logPage: 1
    })
  }
}

// Handle ranking click - jump to logs tab with dimension filter
const handleRankingClick = (type: 'ip' | 'country' | 'region', item: { name: string; count: number }) => {
  // Switch to logs tab
  adminStore.setCurrentTab('logs')

  // Set appropriate filter based on ranking type
  const filters: any = {
    logPage: 1
  }

  switch (type) {
    case 'ip':
      filters.ip = item.name
      break
    case 'country':
      filters.country = item.name
      break
    case 'region':
      filters.region = item.name
      break
  }

  adminStore.updateFilters(filters)
}

// Lifecycle
onMounted(async () => {
  await loadData()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div class="admin-overview-tab">
    <!-- Controls Section -->
    <div class="controls-section">
      <el-row :gutter="16" align="middle" justify="space-between">
        <el-col :xs="24" :sm="16" :md="18">
          <el-space wrap>
            <!-- Time Range Picker -->
            <div class="time-range-control">
              <el-tooltip
                :content="t('admin.overview.selectTimeRange') || 'Select time range'"
                placement="bottom"
              >
                <el-date-picker
                  :model-value="filters.timeRange ? [new Date(filters.timeRange[0]), new Date(filters.timeRange[1])] : undefined"
                  type="datetimerange"
                  :shortcuts="shortcuts"
                  :placeholder="t('admin.dateRange.selectRange') || 'Select date range'"
                  :start-placeholder="t('admin.dateRange.startDate') || 'Start date'"
                  :end-placeholder="t('admin.dateRange.endDate') || 'End date'"
                  :prefix-icon="Calendar"
                  format="YYYY-MM-DD HH:mm"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  @change="handleTimeRangeChange"
                />
              </el-tooltip>
            </div>

            <!-- Current Time Range Display -->
            <div class="time-range-display">
              <el-tooltip
                :content="t('admin.overview.currentTimeRange') || 'Current time range'"
                placement="bottom"
              >
                <div class="time-range-text">
                  <el-icon><TrendCharts /></el-icon>
                  <span>{{ timeRangeText }}</span>
                </div>
              </el-tooltip>
            </div>
          </el-space>
        </el-col>

        <el-col :xs="24" :sm="8" :md="6">
          <!-- Refresh Controls -->
          <div class="refresh-controls">
            <el-space>
              <el-tooltip
                :content="t('admin.overview.refreshData') || 'Refresh data'"
                placement="bottom"
              >
                <el-button
                  type="primary"
                  :icon="Refresh"
                  :loading="loading.overview || loading.activity || loading.ranking"
                  @click="refreshData"
                >
                  {{ t('admin.actions.refresh') || 'Refresh' }}
                </el-button>
              </el-tooltip>
            </el-space>
          </div>
        </el-col>
      </el-row>
    </div>

    <el-divider />

    <!-- Error Alert -->
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      show-icon
      :closable="true"
      @close="error = ''"
      class="error-alert"
    />

    <!-- Content Sections -->
    <div class="content-sections">
      <!-- Stats Cards Section -->
      <div class="stats-section">
        <h3 class="section-title">
          {{ t('admin.overview.keyMetrics') || 'Key Metrics' }}
        </h3>

        <!-- Loading skeleton -->
        <div v-if="loading.overview" class="loading-skeleton">
          <el-row :gutter="16">
            <el-col v-for="n in 4" :key="n" :xs="12" :sm="6">
              <el-skeleton animated>
                <template #template>
                  <div class="skeleton-card">
                    <el-skeleton-item variant="rect" style="height: 80px;" />
                  </div>
                </template>
              </el-skeleton>
            </el-col>
          </el-row>
        </div>

        <!-- Stats Cards -->
        <AdminStatsCards
          v-else
          :data="overviewData"
          :loading="loading.overview"
          @card-click="handleStatsCardClick"
        />
      </div>

      <el-divider />

      <!-- Activity Chart Section -->
      <div class="chart-section">
        <h3 class="section-title">
          {{ t('admin.overview.activityTrends') || 'Activity Trends' }}
        </h3>

        <!-- Loading skeleton -->
        <div v-if="loading.activity" class="loading-skeleton">
          <el-skeleton animated>
            <template #template>
              <div class="skeleton-chart">
                <el-skeleton-item variant="rect" style="height: 300px;" />
              </div>
            </template>
          </el-skeleton>
        </div>

        <!-- Activity Chart -->
        <AdminActivityChart
          v-else
          :data="activityData"
          :loading="loading.activity"
          @refresh="refreshData"
          @drill-down="handleChartDrillDown"
        />
      </div>

      <el-divider />

      <!-- Top Rankings Section -->
      <div class="rankings-section">
        <h3 class="section-title">
          {{ t('admin.overview.topRankings') || 'Top Rankings' }}
        </h3>

        <!-- Loading skeleton -->
        <div v-if="loading.ranking" class="loading-skeleton">
          <el-row :gutter="16">
            <el-col v-for="n in 3" :key="n" :xs="24" :md="8">
              <el-skeleton animated>
                <template #template>
                  <div class="skeleton-ranking">
                    <el-skeleton-item variant="rect" style="height: 200px;" />
                  </div>
                </template>
              </el-skeleton>
            </el-col>
          </el-row>
        </div>

        <!-- Top Rankings -->
        <AdminTopRankings
          v-else
          :data="rankingData"
          :loading="loading.ranking"
          @ranking-click="handleRankingClick"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-overview-tab {
  padding: 1rem;
}

/* Controls Section */
.controls-section {
  margin-bottom: 1rem;
}

.time-range-control :deep(.el-date-editor) {
  width: 300px;
}

.time-range-display {
  background: var(--el-bg-color-page);
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  padding: 8px 12px;
}

.time-range-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  color: var(--el-text-color-regular);
}

.refresh-controls {
  text-align: right;
}

/* Content Sections */
.content-sections {
  margin-top: 1rem;
}

.section-title {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title::before {
  content: '';
  width: 3px;
  height: 16px;
  background: var(--el-color-primary);
  border-radius: 2px;
}

/* Loading Skeletons */
.loading-skeleton {
  margin-bottom: 1rem;
}

.skeleton-card,
.skeleton-chart,
.skeleton-ranking {
  background: var(--el-bg-color);
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid var(--el-border-color-lighter);
}

/* Placeholder Styles */
.content-placeholder {
  text-align: center;
  padding: 3rem 2rem;
  background: var(--el-bg-color);
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.content-placeholder h4 {
  margin-bottom: 0.5rem;
  color: var(--el-text-color-primary);
}

.content-placeholder p {
  margin: 0;
  color: var(--el-text-color-regular);
}

.error-alert {
  margin-bottom: 1rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .admin-overview-tab {
    padding: 0.75rem;
  }

  .controls-section .el-row {
    flex-direction: column;
    gap: 1rem;
  }

  .time-range-control :deep(.el-date-editor) {
    width: 100%;
    max-width: 100%;
  }

  .time-range-display {
    width: 100%;
    text-align: center;
  }

  .refresh-controls {
    text-align: center;
    width: 100%;
  }

  .refresh-controls .el-space {
    justify-content: center;
  }

  .section-title {
    font-size: 1rem;
  }

  .content-placeholder {
    padding: 2rem 1rem;
  }
}

@media (max-width: 480px) {
  .admin-overview-tab {
    padding: 0.5rem;
  }

  .section-title::before {
    width: 2px;
    height: 14px;
  }
}

/* Animation */
.content-sections {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
