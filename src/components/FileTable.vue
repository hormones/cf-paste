<template>
  <div class="file-table-container">
    <el-table
      size="large"
      :data="appStore.fileList"
      style="width: 100%"
      height="100%"
      :empty-text="t('file.noFiles')"
    >
      <el-table-column prop="name" :label="t('common.table.name')" min-width="180">
        <template #default="{ row }">
          <div class="file-name-cell">
            <span class="file-name-text">{{ row.name }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="size" :label="t('common.table.size')" width="120">
        <template #default="{ row }">
          {{ Utils.humanReadableSize(row.size) }}
        </template>
      </el-table-column>
      <el-table-column prop="uploaded" :label="t('common.table.time')" width="180">
        <template #default="{ row }">
          {{ new Date(row.uploaded).toLocaleString() }}
        </template>
      </el-table-column>
      <el-table-column :label="t('common.table.actions')" fixed="right" align="center" width="100">
        <template #default="{ row }">
          <el-button
            class="action-btn"
            type="primary"
            :icon="Download"
            @click="handleFileDownload(row)"
            text
          />
          <el-button
            class="action-btn"
            v-if="!appStore.viewMode"
            type="danger"
            :icon="Delete"
            @click="handleFileDelete(row)"
            text
          />
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ElMessageBox } from 'element-plus'
import { Download, Delete } from '@element-plus/icons-vue'
import { useFileUpload } from '@/composables/useFileUpload'
import type { FileInfo } from '@/types'
import { fileApi } from '@/api/file'
import { useAppStore } from '@/stores'
import { Utils } from '@/utils'
import { useI18nComposable } from '@/composables/useI18n'

const emit = defineEmits(['delete-success'])

const { deleteFile } = useFileUpload()
const appStore = useAppStore()
const { t } = useI18nComposable()

const handleFileDownload = async (file: FileInfo) => {
  fileApi.download(file.name)
}

const handleFileDelete = async (file: FileInfo) => {
  try {
    const message = t('file.deleteConfirm', { filename: file.name })
    await ElMessageBox.confirm(message, t('common.states.warning'), {
      confirmButtonText: t('common.buttons.confirm'),
      cancelButtonText: t('common.buttons.cancel'),
      type: 'warning',
    })
    await deleteFile(file.name)
  } catch (error) {
    // ElMessageBox.confirm handles cancellation exceptions, no additional handling needed
  }
}
</script>

<style scoped>
.file-table-container {
  transition: background-color 0.5s, border-color 0.5s;
}

.el-button.action-btn {
  padding: 4px;
  transition:
    background-color 0.5s,
    color 0.5s,
    border-color 0.5s,
    box-shadow 0.5s;
}

.file-name-cell {
  transition: color 0.5s;
}

.file-name-text {
  transition: color 0.5s;
}

:deep(.el-table),
:deep(.el-table__header-wrapper),
:deep(.el-table__header),
:deep(.el-table__body-wrapper),
:deep(.el-table__body),
:deep(.el-scrollbar__view) {
  transition: background-color 0.5s;
}

:deep(.el-table) {
  transition: background-color 0.5s, border-color 0.5s;
}

:deep(.el-table__header th),
:deep(.el-table__body td) {
  transition: background-color 0.5s, color 0.5s, border-color 0.5s;
}

:deep(.el-table__row),
:deep(.el-table__row:hover td) {
  transition: background-color 0.5s;
}

:deep(.el-table__empty-block) {
  transition: background-color 0.5s, color 0.5s, border-color 0.5s;
}

:deep(.el-table__empty-text) {
  transition: color 0.5s, background-color 0.5s;
}

:deep(.el-button) {
  transition: background-color 0.5s, color 0.5s, border-color 0.5s;
}

:deep(.action-btn .el-icon) {
  transition: color 0.5s;
}
</style>
