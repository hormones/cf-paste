<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { ElEmpty, ElSkeleton, ElButton, ElTooltip } from 'element-plus'
import { Refresh, FullScreen } from '@element-plus/icons-vue'
import { useI18n } from '@/composables/useI18n'
import type { AdminActivityDataPoint } from 'shared/types/admin'

// Props
const props = defineProps<{
  data: AdminActivityDataPoint[]
  loading?: boolean
  height?: string | number
}>()

// Emits
const emit = defineEmits<{
  refresh: []
  drillDown: [bucket: string, metric: string]
}>()

const { t } = useI18n()

// Chart container ref
const chartContainer = ref<HTMLElement>()
const chartInstance = ref<any>(null)

// Chart dimensions
const chartHeight = computed(() => {
  if (typeof props.height === 'number') {
    return `${props.height}px`
  }
  return props.height || '400px'
})

// Fallback chart using pure CSS when ECharts is not available
const useFallbackChart = ref(true)

// Process data for chart
const chartData = computed(() => {
  if (!props.data || props.data.length === 0) {
    return {
      categories: [],
      series: []
    }
  }

  // Group data by bucket (time) and organize by metric
  const bucketData = new Map<string, Map<string, number>>()
  const allMetrics = new Set<string>()

  props.data.forEach(item => {
    if (!bucketData.has(item.bucket)) {
      bucketData.set(item.bucket, new Map())
    }
    bucketData.get(item.bucket)!.set(item.metric, item.count)
    allMetrics.add(item.metric)
  })

  // Sort buckets (time periods)
  const sortedBuckets = Array.from(bucketData.keys()).sort()

  // Create series data for each metric
  const metricsArray = Array.from(allMetrics)
  const series = metricsArray.map(metric => {
    const data = sortedBuckets.map(bucket => {
      return bucketData.get(bucket)?.get(metric) || 0
    })

    return {
      name: getMetricLabel(metric),
      data: data,
      color: getMetricColor(metric),
      metric: metric
    }
  })

  return {
    categories: sortedBuckets,
    series: series
  }
})

// Get metric label
const getMetricLabel = (metric: string): string => {
  const labels: Record<string, string> = {
    'create': t('admin.metrics.create'),
    'update': t('admin.metrics.update'),
    'delete': t('admin.metrics.delete'),
    'view': t('admin.metrics.view'),
    'all': t('admin.metrics.all')
  }
  return labels[metric] || metric
}

// Get metric color
const getMetricColor = (metric: string): string => {
  const colors: Record<string, string> = {
    'create': '#67C23A',
    'update': '#E6A23C',
    'delete': '#F56C6C',
    'view': '#409EFF',
    'all': '#909399'
  }
  return colors[metric] || '#909399'
}

// Format date for display
const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return dateStr
    }

    // Format based on granularity
    if (dateStr.length === 4) {
      // Year format
      return dateStr
    } else if (dateStr.length === 7) {
      // Month format (YYYY-MM)
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
    } else {
      // Day format
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }
  } catch {
    return dateStr
  }
}

// Calculate max value for scaling
const maxValue = computed(() => {
  if (!chartData.value.series.length) return 0

  return Math.max(...chartData.value.categories.map((_, index) => {
    return chartData.value.series.reduce((sum, series) => sum + (series.data[index] || 0), 0)
  }))
})

// Handle chart interactions
const handleDataPointClick = (bucket: string, metric: string) => {
  emit('drillDown', bucket, metric)
}

const handleRefresh = () => {
  emit('refresh')
}

// Resize handler
const handleResize = () => {
  if (chartInstance.value && chartInstance.value.resize) {
    chartInstance.value.resize()
  }
}

// Lifecycle
onMounted(async () => {
  // Try to initialize ECharts (fallback implementation)
  await nextTick()

  // Add resize listener
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  // Cleanup
  window.removeEventListener('resize', handleResize)

  if (chartInstance.value && chartInstance.value.dispose) {
    chartInstance.value.dispose()
  }
})

// Helper method to calculate stack bottom position
const calculateStackBottom = (categoryIndex: number, seriesIndex: number) => {
  if (!chartData.value.series || maxValue.value === 0) return 0

  let bottom = 0
  for (let i = 0; i < seriesIndex; i++) {
    bottom += ((chartData.value.series[i].data[categoryIndex] || 0) / maxValue.value) * 100
  }
  return bottom
}

// Watch data changes
watch(() => props.data, () => {
  // Update chart when data changes
  nextTick(() => {
    // Chart update logic would go here
  })
}, { deep: true })
</script>

<template>
  <div class="admin-activity-chart">
    <!-- Chart Header -->
    <div class="chart-header">
      <div class="chart-title">
        <h4>{{ t('admin.chart.activityTrends') }}</h4>
        <p class="chart-subtitle">
          {{ t('admin.chart.subtitle') }}
        </p>
      </div>
      <div class="chart-actions">
        <el-tooltip
          :content="t('admin.actions.refresh')"
          placement="top"
        >
          <el-button
            :icon="Refresh"
            :loading="loading"
            @click="handleRefresh"
          />
        </el-tooltip>
      </div>
    </div>

    <!-- Chart Content -->
    <div class="chart-content">
      <!-- Loading State -->
      <div v-if="loading" class="chart-loading">
        <el-skeleton animated>
          <template #template>
            <div class="skeleton-chart">
              <div class="skeleton-bars">
                <div
                  v-for="i in 12"
                  :key="i"
                  class="skeleton-bar"
                  :style="{ height: Math.random() * 80 + 20 + '%' }"
                />
              </div>
            </div>
          </template>
        </el-skeleton>
      </div>

      <!-- Empty State -->
      <div v-else-if="!data || data.length === 0" class="chart-empty">
        <el-empty
          :description="t('admin.chart.noData')"
          :image-size="100"
        >
          <el-button type="primary" @click="handleRefresh">
            {{ t('admin.actions.refresh') }}
          </el-button>
        </el-empty>
      </div>

      <!-- Fallback CSS Chart -->
      <div v-else class="fallback-chart" :style="{ height: chartHeight }">
        <div class="chart-container" ref="chartContainer">
          <!-- Legend -->
          <div class="chart-legend">
            <div
              v-for="series in chartData.series"
              :key="series.metric"
              class="legend-item"
            >
              <div
                class="legend-color"
                :style="{ backgroundColor: series.color }"
              />
              <span class="legend-text">{{ series.name }}</span>
            </div>
          </div>

          <!-- Chart Area -->
          <div class="chart-area">
            <!-- Y-axis (values) -->
            <div class="y-axis">
              <div
                v-for="i in 5"
                :key="i"
                class="y-axis-label"
                :style="{ bottom: ((i - 1) * 25) + '%' }"
              >
                {{ Math.round((maxValue * (i - 1)) / 4) }}
              </div>
            </div>

            <!-- Chart bars -->
            <div class="chart-bars">
              <div
                v-for="(category, categoryIndex) in chartData.categories"
                :key="category"
                class="bar-group"
                :style="{ width: (100 / chartData.categories.length) + '%' }"
              >
                <!-- Stacked bars -->
                <div class="stacked-bar">
                  <el-tooltip
                    v-for="(series, seriesIndex) in chartData.series"
                    :key="series.metric"
                    placement="top"
                    :show-after="200"
                  >
                    <template #content>
                      <div class="tooltip-content">
                        <div class="tooltip-title">{{ formatDate(category) }}</div>
                        <div class="tooltip-item">
                          <span class="tooltip-color" :style="{ backgroundColor: series.color }" />
                          <span class="tooltip-label">{{ series.name }}:</span>
                          <span class="tooltip-value">{{ series.data[categoryIndex] || 0 }}</span>
                        </div>
                      </div>
                    </template>
                    <div
                      class="bar-segment"
                      :style="{
                        height: maxValue > 0 ? ((series.data[categoryIndex] || 0) / maxValue * 100) + '%' : '0%',
                        backgroundColor: series.color,
                        bottom: calculateStackBottom(categoryIndex, seriesIndex) + '%'
                      }"
                      @click="handleDataPointClick(category, series.metric)"
                    />
                  </el-tooltip>
                </div>

                <!-- X-axis label -->
                <div class="x-axis-label">
                  {{ formatDate(category) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.admin-activity-chart {
  width: 100%;
  background: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  overflow: hidden;
}

/* Chart Header */
.chart-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.chart-title h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.chart-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.chart-actions {
  display: flex;
  gap: 8px;
}

/* Chart Content */
.chart-content {
  position: relative;
  min-height: 300px;
}

.chart-loading,
.chart-empty {
  padding: 40px 20px;
}

.skeleton-chart {
  height: 300px;
  position: relative;
}

.skeleton-bars {
  display: flex;
  align-items: end;
  height: 100%;
  gap: 8px;
  padding: 20px;
}

.skeleton-bar {
  flex: 1;
  background: var(--el-border-color-lighter);
  border-radius: 4px 4px 0 0;
  animation: pulse 2s infinite;
}

/* Fallback Chart */
.fallback-chart {
  padding: 20px;
  width: 100%;
}

.chart-container {
  width: 100%;
  height: 100%;
  position: relative;
}

/* Legend */
.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-text {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

/* Chart Area */
.chart-area {
  position: relative;
  height: calc(100% - 60px);
  display: flex;
}

.y-axis {
  width: 40px;
  position: relative;
  border-right: 1px solid var(--el-border-color-lighter);
}

.y-axis-label {
  position: absolute;
  right: 8px;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  transform: translateY(50%);
}

.chart-bars {
  flex: 1;
  display: flex;
  align-items: end;
  position: relative;
  border-bottom: 1px solid var(--el-border-color-lighter);
  height: 100%;
  margin: 0 10px;
}

.bar-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  padding: 0 2px;
}

.stacked-bar {
  flex: 1;
  width: 100%;
  position: relative;
  max-width: 40px;
}

.bar-segment {
  position: absolute;
  width: 100%;
  cursor: pointer;
  transition: opacity 0.2s ease;
  border-radius: 2px 2px 0 0;
}

.bar-segment:hover {
  opacity: 0.8;
}

/* Tooltip content styles (used in el-tooltip) */
.tooltip-content {
  min-width: 120px;
}

.tooltip-title {
  font-weight: 600;
  margin-bottom: 6px;
  font-size: 13px;
}

.tooltip-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.tooltip-color {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tooltip-label {
  color: rgba(255, 255, 255, 0.85);
}

.tooltip-value {
  font-weight: 600;
  margin-left: auto;
}

/* X-axis labels */
.x-axis-label {
  margin-top: 8px;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  text-align: center;
  transform: rotate(-45deg);
  transform-origin: center;
  white-space: nowrap;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Responsive Design */
@media (max-width: 768px) {
  .chart-header {
    padding: 16px;
  }

  .fallback-chart {
    padding: 16px;
  }

  .chart-legend {
    gap: 12px;
  }

  .legend-text {
    font-size: 11px;
  }

  .y-axis {
    width: 30px;
  }

  .y-axis-label {
    font-size: 10px;
    right: 4px;
  }

  .x-axis-label {
    font-size: 10px;
    margin-top: 6px;
  }
}

/* Animation */
@keyframes pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.8;
  }
}

.admin-activity-chart {
  animation: fadeIn 0.3s ease-out;
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
