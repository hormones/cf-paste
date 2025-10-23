<template>
  <el-dialog
    v-if="props.visible"
    :model-value="true"
    :width="dialogWidth"
    :style="dialogStyle"
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
    <template #header>
      <div class="preview-header">
        <span class="preview-title">{{ file.name }}</span>
        <div class="preview-actions">
          <el-button-group ref="actionsSlotRef">
            <el-button :icon="Download" @click="handleDownload">
              {{ t('common.buttons.download') }}
            </el-button>
          </el-button-group>
        </div>
      </div>
    </template>

    <div class="preview-body" :style="bodyStyle">
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

      <div v-else-if="category === 'unsupported'" class="unsupported-content">
        <el-icon :size="48" color="var(--el-color-warning)">
          <Warning />
        </el-icon>
        <span class="unsupported-text">{{ t('file.previewUnsupported') }}</span>
      </div>

      <div v-if="loading" class="preview-loading">
        <el-icon class="rotating" :size="40">
          <Loading />
        </el-icon>
        <span>{{ t('file.previewLoading') }}</span>
      </div>

      <div v-else-if="error" class="preview-error">
        <el-icon :size="40">
          <Warning />
        </el-icon>
        <span>{{ error }}</span>
      </div>
    </div>

    <template #footer>
      <div class="preview-footer">
        <span class="file-meta">
          <template v-if="typeMeta">
            {{ typeMeta }} •
          </template>
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
import { Download, Loading, Warning } from '@element-plus/icons-vue'
import type { FileInfo } from '@/types'
import api from '@/api'
import { useI18n } from '@/composables/useI18n'
import { usePreviewSizing } from '@/composables/usePreviewSizing'
import { Utils } from '@/utils'
import { getPreviewCategory, type PreviewCategory } from 'shared/utils/mime'

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

const category = computed<PreviewCategory>(() =>
  getPreviewCategory(props.file.name, props.file.contentType)
)

const fileUrl = computed(
  () =>
    `${api.getUrlPrefix()}/file/download?name=${encodeURIComponent(props.file.name)}&preview=true`
)

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

const fullscreen = ref(false)
const desktopFullscreen = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const typeMeta = ref<string>('')
const actionsSlotRef = ref<ComponentPublicInstance | HTMLElement | null>(null)
const actionsSlotTarget = ref<HTMLElement | null>(null)
const contentSize = ref<{ width: number; height: number } | null>(null)

const {
  dialogWidth,
  dialogStyle,
  bodyStyle,
  isMobile,
  shouldFullscreenForSize,
  contentExceedsViewport,
} = usePreviewSizing({
  category,
  fullscreen,
  contentSize,
})

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

watch(isMobile, (mobile) => {
  if (mobile) {
    desktopFullscreen.value = false
    fullscreen.value = true
  } else {
    fullscreen.value = desktopFullscreen.value
  }
})

watch(contentExceedsViewport, (exceeds) => {
  if (!props.visible || isMobile.value) return
  if (exceeds) {
    desktopFullscreen.value = true
    fullscreen.value = true
  }
})

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      fullscreen.value = isMobile.value
      desktopFullscreen.value = false
      loading.value = false
      error.value = null
      typeMeta.value = ''
      contentSize.value = null
      return
    }

    fullscreen.value = isMobile.value ? true : desktopFullscreen.value
    loading.value = !!contentComponent.value
    error.value = null
    typeMeta.value = ''
    contentSize.value = null
  },
  { immediate: true }
)

watch(contentComponent, (component) => {
  if (!props.visible) return
  loading.value = !!component
})

watch(category, () => {
  desktopFullscreen.value = false
  fullscreen.value = isMobile.value
  if (props.visible) {
    loading.value = !!contentComponent.value
  }
  error.value = null
  typeMeta.value = ''
  contentSize.value = null
})

type LoadedPayload = {
  size?: { width: number; height: number }
}

const handleContentLoaded = (payload?: LoadedPayload) => {
  loading.value = false
  error.value = null
  if (!props.visible) return

  if (isMobile.value) {
    contentSize.value = null
    return
  }

  if (payload?.size) {
    contentSize.value = payload.size
    if (shouldFullscreenForSize(payload.size)) {
      desktopFullscreen.value = true
      fullscreen.value = true
    } else {
      desktopFullscreen.value = false
      fullscreen.value = false
    }
  } else {
    contentSize.value = null
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
  if (isMobile.value) {
    fullscreen.value = true
    desktopFullscreen.value = false
  } else {
    fullscreen.value = false
    desktopFullscreen.value = false
  }
  loading.value = false
  contentSize.value = null
  emit('close')
}

const handleDownload = () => {
  const link = document.createElement('a')
  link.href = fileUrl.value.replace('preview=true', 'preview=false')
  link.download = props.file.name
  link.click()
}

const toggleFullscreen = () => {
  if (isMobile.value) return
  desktopFullscreen.value = !desktopFullscreen.value
  fullscreen.value = desktopFullscreen.value
}

provide('toggleFullscreen', toggleFullscreen)
provide('actionsSlot', actionsSlotTarget)
provide('isMobilePreview', isMobile)
</script>

<style scoped>
.file-preview-dialog :deep(.el-dialog__body) {
  padding: 0;
  display: flex;
  flex-direction: column;
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
  flex: 1;
  width: 100%;
  box-sizing: border-box;
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
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
  flex-wrap: wrap;
}

.file-meta {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
  word-break: break-word;
}

.preview-type-text .preview-body,
.preview-type-markdown .preview-body {
  align-items: stretch;
}

.preview-type-video .preview-body,
.preview-type-audio .preview-body,
.preview-type-pdf .preview-body {
  background: var(--el-bg-color);
}

.preview-type-image .preview-body {
  background: var(--el-bg-color-overlay);
}

.preview-type-unsupported .preview-body {
  background: transparent;
}
</style>
