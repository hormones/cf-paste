<template>
  <component
    :is="previewComponent"
    v-if="props.visible && previewComponent"
    :file="file"
    :file-url="fileUrl"
    :category="category"
    @close="handleClose"
  />

  <!-- Fallback for unsupported files -->
  <el-dialog
    v-else-if="props.visible"
    :model-value="true"
    width="500px"
    class="unsupported-preview-dialog"
    append-to-body
    destroy-on-close
    @close="handleClose"
  >
    <template #header>
      <div class="preview-header">
        <span class="preview-title">{{ file.name }}</span>
      </div>
    </template>

    <div class="unsupported-content">
      <el-icon :size="48" color="var(--el-color-warning)">
        <Warning />
      </el-icon>
      <span class="unsupported-text">{{ t('file.previewUnsupported') }}</span>
      <el-button type="primary" :icon="Download" @click="handleDownload">
        {{ t('common.buttons.download') }}
      </el-button>
    </div>

    <template #footer>
      <div class="preview-footer">
        <span class="file-meta">
          {{ Utils.humanReadableSize(file.size) }} •
          {{ file.contentType || t('file.previewUnknownType') }}
        </span>
        <el-button @click="handleClose">
          {{ t('common.buttons.close') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import { Warning, Download } from '@element-plus/icons-vue'
import type { FileInfo } from '@/types'
import api from '@/api'
import { useI18n } from '@/composables/useI18n'
import { Utils } from '@/utils'
import { getPreviewCategory, type PreviewCategory } from 'shared/utils/mime'

// Lazy load specialized preview components
const ImagePreview = defineAsyncComponent(
  () => import('./previews/ImagePreview.vue')
)
const DocumentPreview = defineAsyncComponent(
  () => import('./previews/DocumentPreview.vue')
)
const MediaPreview = defineAsyncComponent(
  () => import('./previews/MediaPreview.vue')
)
const TextPreview = defineAsyncComponent(
  () => import('./previews/TextPreview.vue')
)

const props = defineProps<{
  visible: boolean
  file: FileInfo
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()

// Determine file category
const category = computed<PreviewCategory>(() =>
  getPreviewCategory(props.file.name, props.file.contentType)
)

// Generate file URL for preview (with preview=true parameter)
const fileUrl = computed(
  () =>
    `${api.getUrlPrefix()}/file/download?name=${encodeURIComponent(props.file.name)}&preview=true`
)

/**
 * Component routing map
 * Routes different file types to specialized preview components
 */
const componentMap: Record<PreviewCategory, any> = {
  image: ImagePreview,
  pdf: DocumentPreview,
  video: MediaPreview,
  audio: MediaPreview,
  markdown: TextPreview,
  text: TextPreview,
  unsupported: null, // Use fallback dialog
}

// Smart component selection based on file type
const previewComponent = computed(() => {
  return componentMap[category.value] || null
})

const handleClose = () => {
  emit('close')
}

const handleDownload = () => {
  const link = document.createElement('a')
  link.href = fileUrl.value
  link.download = props.file.name
  link.click()
}
</script>

<style scoped>
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.preview-title {
  font-weight: 600;
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.unsupported-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 40px 20px;
  text-align: center;
}

.unsupported-text {
  font-size: 15px;
  color: var(--el-text-color-secondary);
}

.preview-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.file-meta {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
