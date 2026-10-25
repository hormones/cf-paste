<template>
  <div class="file-table-container">
    <el-table
      size="large"
      :data="appStore.fileList"
      style="width: 100%"
      height="100%"
      :empty-text="t('file.noFiles')"
    >
      <el-table-column prop="name" :label="t('common.table.name')" min-width="200">
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
      <el-table-column prop="lastModified" :label="t('common.table.time')" width="160">
        <template #default="{ row }">
          {{ new Date(row.lastModified).toLocaleString() }}
        </template>
      </el-table-column>
      <el-table-column :label="t('common.table.actions')" fixed="right" align="center" width="140">
        <template #default="{ row }">
          <el-button
            v-if="canPreview(row)"
            class="action-btn"
            type="primary"
            :icon="View"
            @click="handleFilePreview(row, $event)"
            text
          />
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
    <FilePreview
      v-if="previewFile"
      :visible="previewVisible"
      :file="previewFile"
      @close="handlePreviewClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { View, Download, Delete } from '@element-plus/icons-vue'
import { useFileUpload } from '@/composables/useFileUpload'
import type { FileInfo } from '@/types'
import { fileApi } from '@/api/file'
import api from '@/api'
import { useAppStore } from '@/stores'
import { Utils } from '@/utils'
import { useI18n } from '@/composables/useI18n'
import { isPreviewSupported, getPreviewCategory } from 'shared/utils/mime'
import { PREVIEW_SIZE_LIMITS } from 'shared/constants'
import FilePreview from './FilePreview.vue'

const emit = defineEmits(['delete-success'])

const { deleteFile } = useFileUpload()
const appStore = useAppStore()
const { t } = useI18n()
const previewVisible = ref(false)
const previewFile = ref<FileInfo | null>(null)

const handleFilePreview = (file: FileInfo, event?: MouseEvent) => {
  if (event?.ctrlKey || event?.metaKey) {
    openFileInNewTab(file)
    return
  }
  if (!isPreviewSupported(file.name, file.contentType)) {
    handleFileDownload(file)
    return
  }

  // Check file size for document types (text, markdown, PDF)
  const category = getPreviewCategory(file.name, file.contentType)
  const limits: Record<string, number> = {
    text: PREVIEW_SIZE_LIMITS.TEXT,
    markdown: PREVIEW_SIZE_LIMITS.TEXT,
    pdf: PREVIEW_SIZE_LIMITS.PDF,
  }

  const limit = limits[category]
  if (limit && file.size > limit) {
    ElMessage.warning(
      t('file.previewTooLarge', {
        currentSize: Utils.humanReadableSize(file.size),
      })
    )
    return
  }

  previewFile.value = file
  previewVisible.value = true
}

const handlePreviewClose = () => {
  previewVisible.value = false
  previewFile.value = null
}

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

const canPreview = (file: FileInfo) => isPreviewSupported(file.name, file.contentType)

const openFileInNewTab = (file: FileInfo) => {
  const url = `${api.getUrlPrefix()}/file/download?name=${encodeURIComponent(file.name)}`
  window.open(url, '_blank', 'noopener')
}
</script>

<style scoped>
:deep(.el-button) {
  padding: 0 4px;
}
</style>
