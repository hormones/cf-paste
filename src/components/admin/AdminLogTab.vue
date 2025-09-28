<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import {
  ElAlert,
  ElSpace,
  ElTag,
  ElTooltip,
  ElIcon
} from 'element-plus'
import { InfoFilled, Close } from '@element-plus/icons-vue'
import { useAdminStore } from '@/stores/admin'
import { adminApi } from '@/api/admin'
import { useI18n } from '@/composables/useI18n'
import type {
  AdminLogsRequest,
  AdminLogItem
} from 'shared/types/admin'
import { ActionLabels } from 'shared/types/admin'

// Import sub-components
import AdminLogFilterForm from './AdminLogFilterForm.vue'
import AdminLogTable from './AdminLogTable.vue'

const { t } = useI18n()
const adminStore = useAdminStore()
const { filters, loading } = storeToRefs(adminStore)

// Local state
const logData = ref<AdminLogItem[]>([])
const pagination = ref<Pagination>({
  page: 1,
  pageSize: 50,
  total: 0
})
const error = ref('')

// Form data for filters
const searchForm = ref<AdminLogsRequest>({
  page: 1,
  pageSize: 50,
  word: '',
  ip: '',
  action: undefined,
  country: '',
  region: '',
  desc: '',
  start: undefined,
  end: undefined
})

// Applied filters for display
const appliedFilters = computed(() => {
  const applied: Array<{
    key: string
    label: string
    value: any
    type: 'filter' | 'from-overview'
  }> = []

  // Check current filters from store
  const currentFilters = filters.value

  if (currentFilters.word) {
    applied.push({
      key: 'word',
      label: t('admin.filters.keyword') || 'Keyword',
      value: currentFilters.word,
      type: 'filter'
    })
  }

  if (currentFilters.ip) {
    applied.push({
      key: 'ip',
      label: t('admin.filters.ip') || 'IP',
      value: currentFilters.ip,
      type: 'from-overview'
    })
  }

  if (currentFilters.action !== undefined) {
    const actionLabel = ActionLabels[currentFilters.action as keyof typeof ActionLabels]
    applied.push({
      key: 'action',
      label: t('admin.filters.action') || 'Action',
      value: actionLabel,
      type: 'from-overview'
    })
  }

  if (currentFilters.country) {
    applied.push({
      key: 'country',
      label: t('admin.filters.country') || 'Country',
      value: currentFilters.country,
      type: 'from-overview'
    })
  }

  if (currentFilters.region) {
    applied.push({
      key: 'region',
      label: t('admin.filters.region') || 'Region',
      value: currentFilters.region,
      type: 'from-overview'
    })
  }

  if (currentFilters.timeRange) {
    const [start, end] = currentFilters.timeRange
    const startDate = new Date(start).toLocaleDateString()
    const endDate = new Date(end).toLocaleDateString()
    applied.push({
      key: 'timeRange',
      label: t('admin.filters.timeRange') || 'Time Range',
      value: startDate === endDate ? startDate : `${startDate} - ${endDate}`,
      type: 'from-overview'
    })
  }

  return applied
})

// Initialize search form from store filters
const initializeForm = () => {
  const currentFilters = filters.value

  searchForm.value = {
    page: currentFilters.logPage || 1,
    pageSize: currentFilters.logPageSize || 50,
    word: currentFilters.word || '',
    ip: currentFilters.ip || '',
    action: currentFilters.action,
    country: currentFilters.country || '',
    region: currentFilters.region || '',
    desc: '',
    start: currentFilters.timeRange ? currentFilters.timeRange[0] : undefined,
    end: currentFilters.timeRange ? currentFilters.timeRange[1] : undefined
  }
}

// Fetch logs data
const fetchLogs = async () => {
  try {
    error.value = ''
    adminStore.setLoading('logs', true)

    // Get current search params
    const params: AdminLogsRequest = {
      ...searchForm.value
    }

    // Remove undefined and empty values
    Object.keys(params).forEach(key => {
      const value = params[key as keyof AdminLogsRequest]
      if (value === undefined || value === '') {
        delete params[key as keyof AdminLogsRequest]
      }
    })

    const result = await adminApi.getLogs(params)

    logData.value = result.items || []
    pagination.value = result.pagination || {
      page: params.page || 1,
      pageSize: params.pageSize || 50,
      total: 0
    }

  } catch (err: any) {
    console.error('Failed to fetch logs:', err)
    error.value = err?.message || t('admin.errors.fetchLogsFailed') || 'Failed to fetch logs'
  } finally {
    adminStore.setLoading('logs', false)
  }
}

// Load data (简化为直接获取数据)
const loadData = async () => {
  await fetchLogs()
}

// Handle filter form events
const handleFormUpdate = (newForm: AdminLogsRequest) => {
  searchForm.value = newForm
}

const handleSearch = async () => {
  // Update store filters
  adminStore.updateFilters({
    logPage: searchForm.value.page,
    logPageSize: searchForm.value.pageSize,
    word: searchForm.value.word || undefined,
    ip: searchForm.value.ip || undefined,
    action: searchForm.value.action,
    country: searchForm.value.country || undefined,
    region: searchForm.value.region || undefined,
    timeRange: (searchForm.value.start && searchForm.value.end)
      ? [searchForm.value.start, searchForm.value.end]
      : undefined
  })

  await fetchLogs()
}

const handleReset = () => {
  searchForm.value = {
    page: 1,
    pageSize: 50,
    word: '',
    ip: '',
    action: undefined,
    country: '',
    region: '',
    desc: '',
    start: undefined,
    end: undefined
  }

  // Clear store filters
  adminStore.updateFilters({
    logPage: 1,
    logPageSize: 50,
    word: undefined,
    ip: undefined,
    action: undefined,
    country: undefined,
    region: undefined,
    timeRange: undefined
  })

  fetchLogs()
}

const handleExport = () => {
  // TODO: Implement export functionality
  console.log('Export logs:', searchForm.value)
}

// Handle table events
const handlePageChange = (page: number) => {
  searchForm.value.page = page
  pagination.value.page = page
  handleSearch()
}

const handlePageSizeChange = (pageSize: number) => {
  searchForm.value.pageSize = pageSize
  searchForm.value.page = 1
  pagination.value.pageSize = pageSize
  pagination.value.page = 1
  handleSearch()
}

// Remove specific filter
const removeFilter = (key: string) => {
  const updates: any = {}

  switch (key) {
    case 'word':
      searchForm.value.word = ''
      updates.word = undefined
      break
    case 'ip':
      searchForm.value.ip = ''
      updates.ip = undefined
      break
    case 'action':
      searchForm.value.action = undefined
      updates.action = undefined
      break
    case 'country':
      searchForm.value.country = ''
      updates.country = undefined
      break
    case 'region':
      searchForm.value.region = ''
      updates.region = undefined
      break
    case 'timeRange':
      searchForm.value.start = undefined
      searchForm.value.end = undefined
      updates.timeRange = undefined
      break
  }

  adminStore.updateFilters(updates)
  fetchLogs()
}

// Watch store filters changes (from other components)
watch(() => filters.value, (newFilters) => {
  initializeForm()
  nextTick(() => {
    fetchLogs()
  })
}, { deep: true })

// Lifecycle
onMounted(async () => {
  initializeForm()
  await loadData()
})
</script>

<template>
  <div class="admin-log-tab">
    <!-- Applied Filters Display -->
    <div v-if="appliedFilters.length > 0" class="applied-filters">
      <el-alert
        :title="t('admin.logs.activeFilters') || 'Active Filters'"
        type="info"
        :closable="false"
        show-icon
        class="filters-alert"
      >
        <template #default>
          <div class="filters-content">
            <p class="filters-description">
              {{ t('admin.logs.filtersDescription') || 'The following filters are currently applied to the log view:' }}
            </p>
            <el-space wrap class="filters-tags">
              <el-tag
                v-for="filter in appliedFilters"
                :key="filter.key"
                :type="filter.type === 'from-overview' ? 'warning' : 'primary'"
                closable
                @close="removeFilter(filter.key)"
                class="filter-tag"
              >
                <template #default>
                  <el-tooltip
                    v-if="filter.type === 'from-overview'"
                    :content="t('admin.logs.fromOverview') || 'Filter applied from overview page'"
                    placement="top"
                  >
                    <span class="filter-content">
                      <el-icon class="filter-icon"><InfoFilled /></el-icon>
                      <span class="filter-text">{{ filter.label }}: {{ filter.value }}</span>
                    </span>
                  </el-tooltip>
                  <span v-else class="filter-content">
                    <span class="filter-text">{{ filter.label }}: {{ filter.value }}</span>
                  </span>
                </template>
              </el-tag>
            </el-space>
          </div>
        </template>
      </el-alert>
    </div>

    <!-- Filter Form -->
    <AdminLogFilterForm
      v-model="searchForm"
      :loading="loading.logs"
      @search="handleSearch"
      @reset="handleReset"
      @export="handleExport"
    />

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

    <!-- Data Table -->
    <AdminLogTable
      :data="logData"
      :pagination="pagination"
      :loading="loading.logs"
      :total="pagination.total"
      @page-change="handlePageChange"
      @page-size-change="handlePageSizeChange"
      @export="handleExport"
    />
  </div>
</template>

<style scoped>
.admin-log-tab {
  padding: 1rem;
}

/* Applied Filters */
.applied-filters {
  margin-bottom: 1rem;
}

.filters-alert {
  border-left: 4px solid var(--el-color-primary);
}

.filters-content {
  margin-top: 8px;
}

.filters-description {
  margin: 0 0 12px 0;
  color: var(--el-text-color-regular);
  font-size: 14px;
  line-height: 1.5;
}

.filters-tags {
  min-height: 32px;
}

.filter-tag {
  margin: 2px;
  font-size: 13px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.filter-tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.filter-content {
  display: flex;
  align-items: center;
  gap: 4px;
}

.filter-icon {
  font-size: 12px;
}

.filter-text {
  font-weight: 500;
}

.error-alert {
  margin-bottom: 1rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .admin-log-tab {
    padding: 0.75rem;
  }

  .filters-description {
    font-size: 13px;
  }

  .filter-tag {
    font-size: 12px;
    margin: 1px;
  }
}

@media (max-width: 480px) {
  .admin-log-tab {
    padding: 0.5rem;
  }

  .filters-content {
    margin-top: 6px;
  }

  .filters-description {
    font-size: 12px;
    margin-bottom: 8px;
  }

  .filter-tag {
    font-size: 11px;
    padding: 2px 6px;
  }
}

/* Animation */
.admin-log-tab {
  animation: fadeIn 0.3s ease-out;
}

.filter-tag {
  animation: slideIn 0.2s ease-out;
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

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
