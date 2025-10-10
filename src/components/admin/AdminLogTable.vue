<script setup lang="ts">
import { computed } from 'vue'
import {
  ElCard,
  ElTable,
  ElTableColumn,
  ElPagination,
  ElEmpty,
  ElSkeleton,
  ElTag,
  ElButton,
  ElTooltip
} from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import { useI18n } from '@/composables/useI18n'
import type { AdminLogItem } from 'shared/types/admin'

// Props
const props = defineProps<{
  data: AdminLogItem[]
  pagination: Pagination
  loading?: boolean
  total?: number
}>()

// Emits
const emit = defineEmits<{
  pageChange: [page: number]
  pageSizeChange: [pageSize: number]
}>()

const { t } = useI18n()

// Get action tag type based on action number
const getActionTagType = (action: number): 'success' | 'warning' | 'info' | 'primary' | 'danger' => {
  const typeMap: Record<number, 'success' | 'warning' | 'info' | 'primary' | 'danger'> = {
    1: 'success',   // CREATE
    2: 'warning',   // UPDATE_CONTENT
    3: 'info',      // UPLOAD_FILE
    4: 'primary',   // DOWNLOAD_FILE
    5: 'danger',    // DELETE_FILE
    6: 'primary',   // VIEW
    7: 'danger',    // DELETE
    99: 'info'      // AUTO_EXPIRE
  }
  return typeMap[action] || 'info'
}

// Format timestamp for display
const formatTimestamp = (timestamp?: number): string => {
  if (!timestamp) return '-'

  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return '-'

    // Format as YYYY-MM-DD HH:mm:ss
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch {
    return '-'
  }
}

// Format location display
const formatLocation = (country?: string, region?: string): string => {
  const parts: string[] = []

  if (country && country !== '-') {
    parts.push(country)
  }

  if (region && region !== '-') {
    parts.push(region)
  }

  return parts.length > 0 ? parts.join(' / ') : '-'
}

// Handle pagination events
const handlePageChange = (page: number) => {
  emit('pageChange', page)
}

const handlePageSizeChange = (pageSize: number) => {
  emit('pageSizeChange', pageSize)
}

// Computed properties
const hasData = computed(() => props.data && props.data.length > 0)
const totalCount = computed(() => props.total || props.pagination?.total || 0)
</script>

<template>
  <el-card class="log-table-card" shadow="never">
    <template #header>
      <div class="card-header">
        <div class="header-left">
          <span class="header-title">{{ t('admin.logs.title') }}</span>
          <el-tag v-if="totalCount > 0" type="info" size="small">
            {{ t('admin.logs.totalCount') }}: {{ totalCount }}
          </el-tag>
        </div>
      </div>
    </template>

    <!-- Loading State -->
    <div v-if="loading" class="table-loading">
      <el-skeleton animated>
        <template #template>
          <div class="skeleton-table">
            <!-- Table Header -->
            <div class="skeleton-header">
              <div v-for="i in 7" :key="i" class="skeleton-header-cell" />
            </div>
            <!-- Table Rows -->
            <div v-for="i in 12" :key="i" class="skeleton-row">
              <div v-for="j in 7" :key="j" class="skeleton-cell" />
            </div>
          </div>
        </template>
      </el-skeleton>
    </div>

    <!-- Empty State -->
    <div v-else-if="!hasData" class="table-empty">
      <el-empty
        :description="t('admin.logs.noData')"
        :image-size="100"
      >
        <template #description>
          <div class="empty-description">
            <p>{{ t('admin.logs.noDataDesc') }}</p>
            <p class="empty-hint">{{ t('admin.logs.tryAdjustFilters') }}</p>
          </div>
        </template>
      </el-empty>
    </div>

    <!-- Data Table -->
    <div v-else class="table-container">
      <el-table
        :data="data"
        stripe
        class="logs-table"
        :empty-text="t('admin.logs.noData')"
      >
        <!-- ID Column -->
        <el-table-column
          prop="id"
          :label="t('admin.logs.columns.id')"
          width="80"
          align="center"
          fixed="left"
        >
          <template #default="{ row }">
            <span class="id-cell">#{{ row.id || '-' }}</span>
          </template>
        </el-table-column>

        <!-- Keyword Column -->
        <el-table-column
          prop="word"
          :label="t('admin.logs.columns.keyword')"
          min-width="140"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span class="keyword-cell">{{ row.word || '-' }}</span>
          </template>
        </el-table-column>

        <!-- Action Type Column -->
        <el-table-column
          prop="action"
          :label="t('admin.logs.columns.action')"
          width="110"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="getActionTagType(row.action)"
              size="small"
              class="action-tag"
            >
              {{ t(`admin.actionLabels.${row.action}`) }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- IP Address Column -->
        <el-table-column
          prop="ip"
          :label="t('admin.logs.columns.ip')"
          width="140"
          align="center"
        >
          <template #default="{ row }">
            <span class="ip-cell">{{ row.ip || '-' }}</span>
          </template>
        </el-table-column>

        <!-- Location Column (Country/Region) -->
        <el-table-column
          :label="t('admin.logs.columns.location')"
          width="160"
          align="center"
        >
          <template #default="{ row }">
            <div class="location-cell">
              <div v-if="row.country && row.country !== '-'" class="country-text">
                {{ row.country }}
              </div>
              <div v-if="row.region && row.region !== '-'" class="region-text">
                {{ row.region }}
              </div>
              <span v-if="(!row.country || row.country === '-') && (!row.region || row.region === '-')">
                -
              </span>
            </div>
          </template>
        </el-table-column>

        <!-- Description Column -->
        <el-table-column
          prop="desc"
          :label="t('admin.logs.columns.description')"
          min-width="180"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <div class="description-cell">
              <el-tooltip
                v-if="row.desc && row.desc.length > 30"
                :content="row.desc"
                placement="top"
                :show-after="500"
              >
                <span>{{ row.desc }}</span>
              </el-tooltip>
              <span v-else>{{ row.desc || '-' }}</span>
            </div>
          </template>
        </el-table-column>

        <!-- Action Time Column -->
        <el-table-column
          prop="actionTime"
          :label="t('admin.logs.columns.time')"
          width="160"
          align="center"
        >
          <template #default="{ row }">
            <el-tooltip
              :content="t('admin.logs.exactTime')"
              placement="top"
              :show-after="300"
            >
              <span class="time-cell">{{ formatTimestamp(row.actionTime) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-container">
        <el-pagination
          :current-page="pagination.page"
          :page-size="pagination.pageSize"
          :total="totalCount"
          :page-sizes="[20, 50, 100, 200]"
          :small="false"
          :background="true"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
          class="table-pagination"
        />
      </div>
    </div>
  </el-card>
</template>

<style scoped>
.log-table-card {
  border: 1px solid var(--el-border-color-lighter);
}

/* Card Header */
.card-header {
  display: flex;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-title {
  font-weight: 600;
  font-size: 16px;
  color: var(--el-text-color-primary);
}

/* Loading Skeleton */
.table-loading {
  padding: 20px;
}

.skeleton-table {
  width: 100%;
}

.skeleton-header {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.skeleton-header-cell {
  height: 18px;
  background: var(--el-border-color-light);
  border-radius: 4px;
  flex: 1;
}

.skeleton-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  padding: 0 2px;
}

.skeleton-cell {
  height: 16px;
  background: var(--el-border-color-lighter);
  border-radius: 4px;
  flex: 1;
}

.skeleton-cell:first-child {
  max-width: 60px;
}

.skeleton-cell:nth-child(3) {
  max-width: 80px;
}

.skeleton-cell:last-child {
  max-width: 120px;
}

/* Empty State */
.table-empty {
  padding: 60px 20px;
}

.empty-description {
  text-align: center;
}

.empty-description p {
  margin: 8px 0;
  color: var(--el-text-color-regular);
}

.empty-hint {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
}

/* Table Container */
.table-container {
  min-height: 400px;
  position: relative;
}

.logs-table {
  width: 100%;
}

/* Table Cell Styles */
.id-cell {
  font-family: monospace;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.keyword-cell {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.action-tag {
  font-weight: 500;
  border-radius: 4px;
}

.ip-cell {
  font-family: monospace;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.location-cell {
  line-height: 1.4;
}

.country-text {
  font-weight: 500;
  color: var(--el-text-color-primary);
  font-size: 13px;
}

.region-text {
  font-size: 12px;
  color: var(--el-text-color-regular);
  margin-top: 2px;
}

.description-cell {
  color: var(--el-text-color-regular);
  line-height: 1.4;
}

.time-cell {
  font-family: monospace;
  font-size: 12px;
  color: var(--el-text-color-regular);
  cursor: help;
}

/* Pagination */
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding: 20px 0;
  padding-bottom: 32px; /* Extra bottom padding for pagination visibility */
  border-top: 1px solid var(--el-border-color-lighter);
}

.table-pagination {
  background: var(--el-bg-color);
}

/* Custom table styling */
:deep(.el-table) {
  border-radius: 6px;
}

:deep(.el-table .el-table__header-wrapper) {
  background: var(--el-bg-color-page);
}

:deep(.el-table .el-table__header th) {
  background: var(--el-bg-color-page);
  color: var(--el-text-color-primary);
  font-weight: 600;
  border-bottom: 2px solid var(--el-border-color);
}

:deep(.el-table .el-table__row:hover > td) {
  background-color: var(--el-color-primary-light-9);
}

:deep(.el-table .el-table__row.el-table__row--striped) {
  background-color: var(--el-fill-color-lighter);
}

:deep(.el-table .el-table__row.el-table__row--striped:hover > td) {
  background-color: var(--el-color-primary-light-9);
}

:deep(.el-table .el-table__cell) {
  padding: 12px 8px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .table-container {
    min-height: 400px;
  }

  .logs-table {
    font-size: 13px;
  }

  :deep(.el-table .el-table__cell) {
    padding: 10px 6px;
  }

  .pagination-container {
    padding: 16px 0;
  }

  :deep(.el-pagination) {
    justify-content: center;
  }

  :deep(.el-pagination .btn-prev),
  :deep(.el-pagination .btn-next),
  :deep(.el-pagination .el-pager .number) {
    min-width: 32px;
    height: 32px;
    line-height: 32px;
  }

  :deep(.el-pagination .el-pagination__sizes .el-select .el-input) {
    width: 100px;
  }
}

@media (max-width: 480px) {
  .table-empty {
    padding: 40px 16px;
  }

  .logs-table {
    font-size: 12px;
  }

  :deep(.el-table .el-table__cell) {
    padding: 8px 4px;
  }

  .action-tag {
    font-size: 11px;
    padding: 2px 6px;
  }

  .time-cell {
    font-size: 11px;
  }

  .id-cell {
    font-size: 11px;
  }

  :deep(.el-pagination .el-pagination__total),
  :deep(.el-pagination .el-pagination__jump) {
    display: none;
  }
}

/* Animation */
.log-table-card {
  animation: fadeIn 0.3s ease-out;
}

.skeleton-row {
  animation: pulse 2s infinite;
}

.skeleton-header-cell,
.skeleton-cell {
  animation: shimmer 2s infinite;
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

@keyframes pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.8;
  }
}

@keyframes shimmer {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}

.skeleton-header-cell,
.skeleton-cell {
  background: linear-gradient(90deg, var(--el-border-color-lighter) 25%, var(--el-border-color-light) 50%, var(--el-border-color-lighter) 75%);
  background-size: 200px 100%;
}

/* Focus states for accessibility */
:deep(.el-button:focus-visible) {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

:deep(.el-pagination__jump .el-input__inner:focus-visible) {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}
</style>
