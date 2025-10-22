<template>
  <el-dialog
    :model-value="true"
    :width="dialogSize.width"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
    class="image-preview-dialog"
    append-to-body
    destroy-on-close
    @close="handleClose"
  >
    <template #header>
      <div class="preview-header">
        <span class="preview-title">{{ file.name }}</span>
        <div class="preview-actions">
          <el-button-group size="small">
            <el-button :icon="ZoomOut" @click="handleZoom(0.8)" :disabled="scale <= 0.2">
              {{ Math.round(scale * 100) }}%
            </el-button>
            <el-button :icon="ZoomIn" @click="handleZoom(1.25)" :disabled="scale >= 5" />
            <el-button :icon="RefreshLeft" @click="handleReset" />
            <el-button :icon="FullScreen" @click="handleFullscreen" />
          </el-button-group>
        </div>
      </div>
    </template>

    <div class="image-container" :style="containerStyle">
      <div v-if="loading" class="image-loading">
        <el-icon class="rotating" :size="40">
          <Loading />
        </el-icon>
        <span>{{ t('file.previewLoading') }}</span>
      </div>

      <div v-else-if="error" class="image-error">
        <el-icon :size="40">
          <Warning />
        </el-icon>
        <span>{{ error }}</span>
      </div>

      <img
        v-else
        ref="imageRef"
        :src="fileUrl"
        :alt="file.name"
        :style="imageStyle"
        @load="handleImageLoad"
        @error="handleImageError"
      />
    </div>

    <template #footer>
      <div class="preview-footer">
        <span class="file-meta">
          <template v-if="imageSize.width && imageSize.height">
            {{ imageSize.width }} × {{ imageSize.height }} •
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
import { ref, computed, watch } from 'vue'
import { Loading, Warning, ZoomIn, ZoomOut, FullScreen, RefreshLeft } from '@element-plus/icons-vue'
import type { FileInfo } from '@/types'
import { useI18n } from '@/composables/useI18n'
import { usePreviewSize, useContentMeasurement } from '@/composables/usePreviewSize'
import { Utils } from '@/utils'

const props = defineProps<{
  file: FileInfo
  fileUrl: string
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const loading = ref(true)
const error = ref<string | null>(null)
const imageRef = ref<HTMLImageElement>()
const imageSize = ref({ width: 0, height: 0 })

// Smart sizing with content awareness
const { dialogSize, scale, zoom, updateContentSize } = usePreviewSize({
  category: 'image',
})

// Update dialog size when image loads
const handleImageLoad = (event: Event) => {
  const img = event.target as HTMLImageElement
  imageSize.value = {
    width: img.naturalWidth,
    height: img.naturalHeight,
  }

  // Update size calculator with actual image dimensions
  updateContentSize({
    width: img.naturalWidth,
    height: img.naturalHeight,
  })

  loading.value = false
}

const handleImageError = () => {
  error.value = t('file.previewLoadError')
  loading.value = false
}

const handleClose = () => {
  emit('close')
}

const handleZoom = (factor: number) => {
  zoom(factor)
}

const handleReset = () => {
  if (imageSize.value.width && imageSize.value.height) {
    updateContentSize(imageSize.value)
    zoom(1 / scale.value) // Reset to 1
  }
}

const handleFullscreen = () => {
  if (imageRef.value) {
    imageRef.value.requestFullscreen?.()
  }
}

// Container fills the dialog body
const containerStyle = computed(() => ({
  width: '100%',
  height: `calc(${dialogSize.value.height} - 160px)`, // Subtract header + footer
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  overflow: 'auto',
  background: 'var(--el-fill-color-lighter)',
  borderRadius: '8px',
}))

// Image sizing
const imageStyle = computed(() => ({
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain' as const,
  transform: `scale(${scale.value})`,
  transformOrigin: 'center',
  transition: 'transform 0.3s ease',
  cursor: scale.value > 1 ? 'grab' : 'default',
}))
</script>

<style scoped>
.image-preview-dialog :deep(.el-dialog__body) {
  padding: 16px;
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

.image-container {
  position: relative;
}

.image-loading,
.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--el-text-color-secondary);
}

.image-error {
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

img {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
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
