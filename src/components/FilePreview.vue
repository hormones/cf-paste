<template>
  <!-- Main preview dialog -->
  <el-dialog
    v-if="props.visible"
    :model-value="true"
    :width="dialogWidth"
    :fullscreen="fullscreen"
    :align-center="!fullscreen"
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
          <el-button-group
            ref="actionsSlotRef"
          >
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
        @resize="handleResize"
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
import { computed, ref, watch, provide, defineAsyncComponent, watchEffect } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import type { PreviewResizePayload } from '@/types/preview'
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
const typeMeta = ref<string>('')
const actionsSlotRef = ref<ComponentPublicInstance | HTMLElement | null>(null)
const actionsSlotTarget = ref<HTMLElement | null>(null)
const customSize = ref<PreviewResizePayload | null>(null)

watchEffect(() => {
  const current = actionsSlotRef.value as ComponentPublicInstance | HTMLElement | null
  if (!current) {
    actionsSlotTarget.value = null
    return
  }

  const maybeComponent = current as ComponentPublicInstance
  const el = (maybeComponent as any)?.$el || current
  actionsSlotTarget.value = (el as HTMLElement) || null
})

const normalizeDimension = (value?: number | string): string | undefined => {
  if (value === undefined) return undefined
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return undefined
    return `${value}px`
  }
  const trimmed = value.trim()
  return trimmed || undefined
}

const defaultSize: PreviewResizePayload = {
  width: 600,
  minHeight: 300,
  maxHeight: '80vh',
}

const categoryFallbacks: Partial<Record<PreviewCategory, PreviewResizePayload>> = {
  audio: {
    width: 520,
    minHeight: 120,
    maxHeight: 200,
  },
}

const resolvedSize = computed<PreviewResizePayload>(() => ({
  ...defaultSize,
  ...(categoryFallbacks[category.value] || {}),
  ...(customSize.value || {}),
}))

const handleResize = (payload?: PreviewResizePayload | null) => {
  customSize.value = payload ? { ...payload } : null
}


// Check if current type supports custom actions

// Dialog width derived from resolved size or fullscreen
const dialogWidth = computed(() => {
  if (fullscreen.value) return '100%'
  return normalizeDimension(resolvedSize.value.width) || '600px'
})

// Body style uses resolved size or fullscreen override
const bodyStyle = computed(() => {
  if (fullscreen.value) {
    const fillHeight = 'calc(100vh - 160px)'
    return {
      minHeight: fillHeight,
      maxHeight: fillHeight,
      overflow: 'auto',
    }
  }

  const minHeight = normalizeDimension(resolvedSize.value.minHeight) || '300px'
  const maxHeight = normalizeDimension(resolvedSize.value.maxHeight) || '80vh'

  return {
    minHeight,
    maxHeight,
    overflow: 'auto',
  }
})

// Event handlers
const handleContentLoaded = () => {
  loading.value = false
}

const handleContentError = (message: string) => {
  loading.value = false
  error.value = message || t('file.previewLoadError')
  customSize.value = null
}

const handleMetaUpdate = (meta: string) => {
  typeMeta.value = meta
}

const handleClose = () => {
  fullscreen.value = false
  customSize.value = null
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
provide('actionsSlot', actionsSlotTarget)

// Reset state when dialog closes
watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      fullscreen.value = false
      loading.value = false
      error.value = null
      customSize.value = null
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
  customSize.value = null
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
