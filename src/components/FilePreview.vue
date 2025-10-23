<template>
  <el-dialog
    v-if="props.visible"
    :model-value="true"
    :show-close="false"
    :fullscreen="true"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
    append-to-body
    destroy-on-close
    class="file-preview-modal"
    body-class="file-preview-body"
    @close="handleClose"
  >
    <template #header>
      <div class="preview-header">
        <div class="preview-info">
          <span class="preview-name" :title="file.name">{{ file.name }}</span>
          <span class="preview-meta">{{ Utils.humanReadableSize(file.size) }}</span>
          <span v-if="typeMeta" class="preview-meta">{{ typeMeta }}</span>
          <span class="preview-meta">{{ file.contentType || t('file.previewUnknownType') }}</span>
        </div>
        <div class="preview-actions">
          <el-button-group ref="actionsSlotRef" class="preview-extra-actions" />
          <el-button-group>
            <el-button :icon="Download" @click="handleDownload">
              {{ t('common.buttons.download') }}
            </el-button>
            <el-button type="primary" @click="handleClose">
              {{ t('common.buttons.close') }}
            </el-button>
          </el-button-group>
        </div>
      </div>
    </template>

    <section class="preview-content">
      <div class="preview-stage" :class="`preview-type-${category}`">
        <component
          :is="contentComponent"
          v-if="contentComponent"
          :file="file"
          :file-url="fileUrl"
          v-bind="contentProps"
          @loaded="handleContentLoaded"
          @error="handleContentError"
          @meta="handleMetaUpdate"
        />

        <div v-else class="unsupported-content">
          <el-icon :size="48" color="var(--el-color-warning)">
            <Warning />
          </el-icon>
          <span class="unsupported-text">{{ t('file.previewUnsupported') }}</span>
        </div>

        <div v-if="loading" class="preview-overlay">
          <el-icon class="rotating" :size="40">
            <Loading />
          </el-icon>
          <span>{{ t('file.previewLoading') }}</span>
        </div>

        <div v-else-if="error" class="preview-overlay is-error">
          <el-icon :size="40">
            <Warning />
          </el-icon>
          <span>{{ error }}</span>
        </div>
      </div>
    </section>
  </el-dialog>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { computed, defineAsyncComponent, provide, ref, watch } from 'vue'
import { Download, Loading, Warning } from '@element-plus/icons-vue'
import type { FileInfo } from '@/types'
import api from '@/api'
import { useI18n } from '@/composables/useI18n'
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

const contentProps = computed(() => {
  if (category.value === 'video' || category.value === 'audio') {
    return { category: category.value as 'video' | 'audio' }
  }
  if (category.value === 'text' || category.value === 'markdown') {
    return { category: category.value as 'text' | 'markdown' }
  }
  return {}
})

const loading = ref(false)
const error = ref<string | null>(null)
const typeMeta = ref('')
const actionsSlotRef = ref<ComponentPublicInstance | HTMLElement | null>(null)
const actionsSlotTarget = ref<HTMLElement | null>(null)

const resetState = () => {
  loading.value = !!contentComponent.value
  error.value = null
  typeMeta.value = ''
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      resetState()
    } else {
      loading.value = false
      error.value = null
      typeMeta.value = ''
    }
  },
  { immediate: true }
)

watch(contentComponent, () => {
  if (!props.visible) return
  resetState()
})

watch(
  () => actionsSlotRef.value,
  (current) => {
    if (!current) {
      actionsSlotTarget.value = null
      return
    }

    const maybeComponent = current as ComponentPublicInstance
    const el = (maybeComponent as any)?.$el || current
    actionsSlotTarget.value = (el as HTMLElement) || null
  },
  { immediate: true }
)

provide('actionsSlot', actionsSlotTarget)

const handleContentLoaded = () => {
  loading.value = false
  error.value = null
}

const handleContentError = (message: string) => {
  loading.value = false
  error.value = message || t('file.previewLoadError')
}

const handleMetaUpdate = (meta: string) => {
  typeMeta.value = meta
}

const handleClose = () => {
  loading.value = false
  error.value = null
  typeMeta.value = ''
  emit('close')
}

const handleDownload = () => {
  const link = document.createElement('a')
  link.href = fileUrl.value.replace('preview=true', 'preview=false')
  link.download = props.file.name
  link.click()
}
</script>

<style>
.file-preview-modal {
  display: flex;
  flex-direction: column;
}

.file-preview-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
</style>

<style scoped>
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.preview-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.preview-name {
  font-weight: 600;
  font-size: 16px;
  max-width: 480px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-meta {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.preview-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.preview-extra-actions {
  display: flex;
}

@media (max-width: 768px) {
  .preview-header {
    align-items: flex-start;
  }

  .preview-actions {
    width: 100%;
    justify-content: flex-start;
  }
}

.preview-content {
  flex: 1;
  min-height: 0;
  display: flex;
}

.preview-stage {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--el-fill-color-lighter);
  border-radius: 12px;
  overflow: hidden;
}

.preview-stage.preview-type-text,
.preview-stage.preview-type-markdown {
  align-items: stretch;
}

.preview-stage.preview-type-video,
.preview-stage.preview-type-audio,
.preview-stage.preview-type-pdf {
  background: var(--el-bg-color);
}

.preview-stage.preview-type-image {
  background: var(--el-bg-color-overlay);
}

.unsupported-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 40px 20px;
  text-align: center;
  color: var(--el-text-color-secondary);
}

.unsupported-text {
  font-size: 15px;
}

.preview-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.85);
  color: var(--el-text-color-secondary);
  z-index: 10;
}

.preview-overlay.is-error {
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
</style>
