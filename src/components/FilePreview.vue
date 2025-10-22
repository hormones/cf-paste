<template>
  <!-- Main preview dialog -->
  <el-dialog
    v-if="props.visible"
    :model-value="true"
    :width="dialogWidth"
    :fullscreen="fullscreen"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
    class="file-preview-dialog"
    :class="`preview-type-${category}`"
    append-to-body
    destroy-on-close
    @close="handleClose"
  >
    <!-- Header: file name + type-specific actions + download -->
    <template #header>
      <div class="preview-header">
        <span class="preview-title">{{ file.name }}</span>
        <div class="preview-actions">
          <el-button-group size="small">
            <!-- Type-specific action buttons placeholder -->
            <template v-if="typeActionsEnabled">
              <component
                :is="'span'"
                ref="actionsSlotRef"
                data-preview-actions
              />
            </template>
            <!-- Common download button -->
            <el-button :icon="Download" @click="handleDownload">
              {{ t('common.buttons.download') }}
            </el-button>
          </el-button-group>
        </div>
      </div>
    </template>

    <!-- Body: content area with dynamic component -->
    <div class="preview-body" :style="bodyStyle">
      <!-- Content component -->
      <component
        :is="contentComponent"
        v-if="contentComponent"
        :file="file"
        :file-url="fileUrl"
        :fullscreen="fullscreen"
        :category="category"
        @loaded="handleContentLoaded"
        @error="handleContentError"
        @meta="handleMetaUpdate"
      />

      <!-- Unsupported file type fallback -->
      <div v-else-if="category === 'unsupported'" class="unsupported-content">
        <el-icon :size="48" color="var(--el-color-warning)">
          <Warning />
        </el-icon>
        <span class="unsupported-text">{{ t('file.previewUnsupported') }}</span>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="preview-loading">
        <el-icon class="rotating" :size="40">
          <Loading />
        </el-icon>
        <span>{{ t('file.previewLoading') }}</span>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="preview-error">
        <el-icon :size="40">
          <Warning />
        </el-icon>
        <span>{{ error }}</span>
      </div>
    </div>

    <!-- Footer: file metadata + close button -->
    <template #footer>
      <div class="preview-footer">
        <span class="file-meta">
          <!-- Type-specific metadata (dimensions, duration, etc.) -->
          <template v-if="typeMeta">
            {{ typeMeta }} •
          </template>
          <!-- Common file info -->
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
import { computed, ref, watch, provide, defineAsyncComponent } from 'vue'
import { Download, Loading, Warning } from '@element-plus/icons-vue'
import type { FileInfo } from '@/types'
import api from '@/api'
import { useI18n } from '@/composables/useI18n'
import { Utils } from '@/utils'
import { getPreviewCategory, type PreviewCategory } from 'shared/utils/mime'

// Lazy load content components
const ImagePreviewContent = defineAsyncComponent(
  () => import('./preview-contents/ImagePreviewContent.vue')
)
const DocumentPreviewContent = defineAsyncComponent(
  () => import('./preview-contents/DocumentPreviewContent.vue')
)
const MediaPreviewContent = defineAsyncComponent(
  () => import('./preview-contents/MediaPreviewContent.vue')
)
const TextPreviewContent = defineAsyncComponent(
  () => import('./preview-contents/TextPreviewContent.vue')
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

// Generate file URL for preview
const fileUrl = computed(
  () =>
    `${api.getUrlPrefix()}/file/download?name=${encodeURIComponent(props.file.name)}&preview=true`
)

// Component mapping
const componentMap: Record<PreviewCategory, any> = {
  image: ImagePreviewContent,
  pdf: DocumentPreviewContent,
  video: MediaPreviewContent,
  audio: MediaPreviewContent,
  markdown: TextPreviewContent,
  text: TextPreviewContent,
  unsupported: null,
}

const contentComponent = computed(() => componentMap[category.value] || null)

// State management
const fullscreen = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const contentSize = ref<{ width: number; height: number } | null>(null)
const typeMeta = ref<string>('')
const actionsSlotRef = ref<HTMLElement>()

// Check if current type supports custom actions
const typeActionsEnabled = computed(() =>
  ['image', 'pdf', 'video', 'text', 'markdown'].includes(category.value)
)

// Dialog width calculation based on category and content
const dialogWidth = computed(() => {
  if (fullscreen.value) return '100%'

  const viewportWidth = window.innerWidth

  switch (category.value) {
    case 'image':
      if (!contentSize.value) return '600px'
      const imageWidth = Math.min(contentSize.value.width, viewportWidth * 0.9)
      return `${Math.max(400, imageWidth)}px`

    case 'pdf':
      return `${Math.min(1200, viewportWidth * 0.9)}px`

    case 'video':
      return `${Math.min(960, viewportWidth * 0.85)}px`

    case 'audio':
      return '520px'

    case 'text':
    case 'markdown':
      return `${Math.min(800, viewportWidth * 0.85)}px`

    case 'unsupported':
      return '500px'

    default:
      return '600px'
  }
})

// Body style based on category
const bodyStyle = computed(() => {
  const viewportHeight = window.innerHeight

  let minHeight = '300px'
  let maxHeight = 'auto'

  if (fullscreen.value) {
    maxHeight = 'calc(100vh - 160px)'
  } else {
    switch (category.value) {
      case 'image':
        if (contentSize.value) {
          const imageHeight = Math.min(contentSize.value.height, viewportHeight * 0.85)
          maxHeight = `${Math.max(300, imageHeight)}px`
        } else {
          maxHeight = '400px'
        }
        break

      case 'pdf':
        maxHeight = `${Math.round(viewportHeight * 0.85)}px`
        break

      case 'video':
        const width = Math.min(960, window.innerWidth * 0.85)
        const height = Math.min(width / (16 / 9), viewportHeight * 0.75)
        maxHeight = `${height}px`
        break

      case 'audio':
        minHeight = '120px'
        maxHeight = '200px'
        break

      case 'text':
      case 'markdown':
        maxHeight = `${Math.round(viewportHeight * 0.75)}px`
        break

      case 'unsupported':
        minHeight = '200px'
        maxHeight = '300px'
        break
    }
  }

  return {
    minHeight,
    maxHeight,
    overflow: 'auto',
  }
})

// Event handlers
const handleContentLoaded = (data?: { size?: { width: number; height: number } }) => {
  loading.value = false

  if (data?.size) {
    contentSize.value = data.size
  }
}

const handleContentError = (message: string) => {
  loading.value = false
  error.value = message || t('file.previewLoadError')
}

const handleMetaUpdate = (meta: string) => {
  typeMeta.value = meta
}

const handleClose = () => {
  fullscreen.value = false
  emit('close')
}

const handleDownload = () => {
  const link = document.createElement('a')
  link.href = fileUrl.value.replace('preview=true', 'preview=false')
  link.download = props.file.name
  link.click()
}

// Provide functions to content components
const toggleFullscreen = () => {
  fullscreen.value = !fullscreen.value
}

provide('toggleFullscreen', toggleFullscreen)
provide('actionsSlot', actionsSlotRef)

// Reset state when dialog closes
watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      fullscreen.value = false
      loading.value = false
      error.value = null
      contentSize.value = null
      typeMeta.value = ''
    } else {
      // Set initial loading state for supported types
      if (contentComponent.value) {
        loading.value = true
      }
    }
  }
)

// Reset fullscreen when category changes
watch(category, () => {
  fullscreen.value = false
})
</script>

<style scoped>
.file-preview-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 16px;
}

.preview-title {
  font-weight: 600;
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.preview-actions {
  flex-shrink: 0;
}

.preview-body {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--el-fill-color-lighter);
  padding: 16px;
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

.preview-loading,
.preview-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-lighter);
  z-index: 10;
}

.preview-error {
  color: var(--el-color-danger);
}

.rotating {
  animation: rotate 1.5s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
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
