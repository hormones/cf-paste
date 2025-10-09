<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  ElRow,
  ElCol,
  ElCard,
  ElForm,
  ElFormItem,
  ElInput,
  ElSelect,
  ElOption,
  ElDatePicker,
  ElButton,
  ElSpace
} from 'element-plus'
import {
  Search,
  Refresh,
  Filter
} from '@element-plus/icons-vue'
import { useI18n } from '@/composables/useI18n'
import type { AdminLogsRequest } from 'shared/types/admin'
import { ActionLabels } from 'shared/types/admin'

// Props
const props = defineProps<{
  modelValue: AdminLogsRequest
  loading?: boolean
}>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: AdminLogsRequest]
  search: []
  reset: []
}>()

const { t } = useI18n()

// Form data - use computed to sync with v-model
const formData = computed({
  get: () => props.modelValue,
  set: (value: AdminLogsRequest) => {
    emit('update:modelValue', value)
  }
})

// Action options for select
const actionOptions = computed(() => [
  { label: t('admin.actions.all') || 'All Actions', value: '' },
  { label: t('admin.actionLabels.1') || 'Create', value: 1 },           // CREATE
  { label: t('admin.actionLabels.2') || 'Update Content', value: 2 },   // UPDATE_CONTENT
  { label: t('admin.actionLabels.3') || 'Upload File', value: 3 },       // UPLOAD_FILE
  { label: t('admin.actionLabels.4') || 'Download File', value: 4 },     // DOWNLOAD_FILE
  { label: t('admin.actionLabels.5') || 'Delete File', value: 5 },       // DELETE_FILE
  { label: t('admin.actionLabels.6') || 'View', value: 6 },              // VIEW
  { label: t('admin.actionLabels.7') || 'Delete', value: 7 },            // DELETE
  { label: t('admin.actionLabels.99') || 'Auto Expire', value: 99 }      // AUTO_EXPIRE
])

// Update individual form fields
const updateField = (field: keyof AdminLogsRequest, value: any) => {
  const newData = { ...formData.value }
  newData[field] = value
  emit('update:modelValue', newData)
}

// Handle date range change
const handleDateRangeChange = (range: [Date, Date] | null) => {
  if (range) {
    updateField('start', range[0].getTime())
    updateField('end', range[1].getTime())
  } else {
    updateField('start', undefined)
    updateField('end', undefined)
  }
}

// Handle form actions
const handleSearch = () => {
  emit('search')
}

const handleReset = () => {
  emit('reset')
}

// Handle Enter key in input fields
const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    handleSearch()
  }
}
</script>

<template>
  <el-card class="filter-form-card" shadow="never">
    <template #header>
      <div class="card-header">
        <div class="header-left">
          <el-icon><Filter /></el-icon>
          <span class="header-title">{{ t('admin.logs.filters') || 'Search Filters' }}</span>
        </div>
        <el-button
          type="primary"
          text
          @click="handleReset"
        >
          {{ t('admin.actions.reset') || 'Reset' }}
        </el-button>
      </div>
    </template>

    <el-form
      :model="formData"
      label-position="top"
      class="filter-form"
    >
      <el-row :gutter="16">
        <!-- Keyword -->
        <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="6">
          <el-form-item :label="t('admin.filters.keyword') || 'Keyword'">
            <el-input
              :model-value="formData.word"
              :placeholder="t('admin.filters.keywordPlaceholder') || 'Enter keyword to search'"
              clearable
              @input="(value: string) => updateField('word', value)"
              @keypress="handleKeyPress"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-form-item>
        </el-col>

        <!-- IP Address -->
        <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="6">
          <el-form-item :label="t('admin.filters.ip') || 'IP Address'">
            <el-input
              :model-value="formData.ip"
              :placeholder="t('admin.filters.ipPlaceholder') || 'Enter IP address'"
              clearable
              @input="(value: string) => updateField('ip', value)"
              @keypress="handleKeyPress"
            />
          </el-form-item>
        </el-col>

        <!-- Action Type -->
        <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="6">
          <el-form-item :label="t('admin.filters.action') || 'Action Type'">
            <el-select
              :model-value="formData.action"
              :placeholder="t('admin.filters.actionPlaceholder') || 'Select action type'"
              clearable
              class="w-full"
              @change="(value: number | undefined) => updateField('action', value)"
            >
              <el-option
                v-for="option in actionOptions"
                :key="option.value || 'all'"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
        </el-col>

        <!-- Country -->
        <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="6">
          <el-form-item :label="t('admin.filters.country') || 'Country'">
            <el-input
              :model-value="formData.country"
              :placeholder="t('admin.filters.countryPlaceholder') || 'Enter country name'"
              clearable
              @input="(value: string) => updateField('country', value)"
              @keypress="handleKeyPress"
            />
          </el-form-item>
        </el-col>

        <!-- Region -->
        <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="6">
          <el-form-item :label="t('admin.filters.region') || 'Region'">
            <el-input
              :model-value="formData.region"
              :placeholder="t('admin.filters.regionPlaceholder') || 'Enter region name'"
              clearable
              @input="(value: string) => updateField('region', value)"
              @keypress="handleKeyPress"
            />
          </el-form-item>
        </el-col>

        <!-- Description -->
        <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="6">
          <el-form-item :label="t('admin.filters.description') || 'Description'">
            <el-input
              :model-value="formData.desc"
              :placeholder="t('admin.filters.descriptionPlaceholder') || 'Enter description'"
              clearable
              @input="(value: string) => updateField('desc', value)"
              @keypress="handleKeyPress"
            />
          </el-form-item>
        </el-col>

        <!-- Date Range -->
        <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="6">
          <el-form-item :label="t('admin.filters.timeRange') || 'Time Range'">
            <el-date-picker
              :model-value="formData.start && formData.end ? [new Date(formData.start), new Date(formData.end)] : undefined"
              type="datetimerange"
              :start-placeholder="t('admin.filters.startDate') || 'Start date'"
              :end-placeholder="t('admin.filters.endDate') || 'End date'"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm:ss"
              @change="handleDateRangeChange"
              class="w-full"
            />
          </el-form-item>
        </el-col>

      </el-row>

      <!-- Action Buttons Row -->
      <el-row class="action-buttons-row">
        <el-col :span="24">
          <el-space wrap :size="12">
            <el-button
              type="primary"
              :icon="Search"
              :loading="loading"
              @click="handleSearch"
            >
              {{ t('admin.actions.search') || 'Search' }}
            </el-button>
          </el-space>
        </el-col>
      </el-row>
    </el-form>
  </el-card>
</template>

<style scoped>
.filter-form-card {
  margin-bottom: 1rem;
  border: 1px solid var(--el-border-color-lighter);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.filter-form {
  margin-top: 1rem;
}

.w-full {
  width: 100%;
}

/* Action Buttons Row */
.action-buttons-row {
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.action-buttons-row .el-space {
  width: 100%;
}

/* Form field styling */
:deep(.el-form-item) {
  margin-bottom: 18px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--el-text-color-primary);
  padding-bottom: 6px;
}

:deep(.el-input__wrapper) {
  transition: all 0.2s ease;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--el-color-primary-light-7) inset;
}

:deep(.el-input.is-focus .el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

/* Select styling */
:deep(.el-select .el-input__wrapper) {
  cursor: pointer;
}

:deep(.el-select .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--el-color-primary-light-7) inset;
}

/* Date picker styling */
:deep(.el-date-editor) {
  width: 100%;
}

:deep(.el-date-editor .el-input__wrapper) {
  width: 100%;
}

/* Responsive Design */
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .filter-form {
    margin-top: 0.75rem;
  }

  :deep(.el-form-item) {
    margin-bottom: 16px;
  }

  .action-buttons-row {
    padding-top: 12px;
  }

  .action-buttons-row .el-button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  :deep(.el-form-item) {
    margin-bottom: 14px;
  }

  :deep(.el-form-item__label) {
    font-size: 13px;
    padding-bottom: 4px;
  }

  .action-buttons-row {
    padding-top: 10px;
  }

  .action-buttons-row .el-button {
    width: 100%;
    font-size: 13px;
    padding: 8px 16px;
  }
}

/* Animation */
.filter-form-card {
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Focus states for accessibility */
:deep(.el-button:focus-visible) {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

:deep(.el-input__inner:focus-visible) {
  outline: none;
}
</style>
