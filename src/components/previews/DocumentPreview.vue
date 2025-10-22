<template>
  <el-dialog
    :model-value="true"
    :width="dialogWidth"
    :fullscreen="isFullscreen"
    class="document-preview-dialog"
    append-to-body
    destroy-on-close
    @close="handleClose"
  >
    <template #header>
      <div class="preview-header">
        <span class="preview-title">{{ file.name }}</span>
        <div class="preview-actions">
          <el-button-group size="small">
            <el-button :icon="FullScreen" @click="toggleFullscreen">
              {{ isFullscreen ? t('common.buttons.exitFullscreen') : t('common.buttons.fullscreen') }}
            </el-button>
            <el-button :icon="Download" @click="handleDownload">
              {{ t('common.buttons.download') }}
            </el-button>
          </el-button-group>
        </div>
      </div>
    </template>

    <div class="document-container">
      <div v-if="loading" class="document-loading">
        <el-icon class="rotating" :size="40">
          <Loading />
        </el-icon>
        <span>{{ t('file.previewLoading') }}</span>
      </div>

      <iframe
        v-else
        :src="fileUrl"
        :style="iframeStyle"
        frameborder="0"
        @load="handleLoad"
      />
    </div>

    <template #footer>
      <div class="preview-footer">
        <span class="file-meta">
          {{ Utils.humanReadableSize(file.size) }} •
          {{ file.contentType || 'application/pdf' }}
        </span>
        <el-button @click="handleClose">
          {{ t('common.buttons.close') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Loading, FullScreen, Download } from '@element-plus/icons-vue'
import type { FileInfo } from '@/types'
import { useI18n } from '@/composables/useI18n'
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
const isFullscreen = ref(false)

// PDF uses fixed large size for comfortable document reading
const dialogWidth = computed(() => {
  if (isFullscreen.value) return '100%'

  const viewportWidth = window.innerWidth
  return `${Math.min(1200, viewportWidth * 0.9)}px`
})

const iframeStyle = computed(() => {
  const viewportHeight = window.innerHeight

  return {
    width: '100%',
    height: isFullscreen.value
      ? `calc(100vh - 140px)` // Full viewport minus header and footer
      : `${Math.round(viewportHeight * 0.85)}px`,
    border: 'none',
    borderRadius: '8px',
    background: '#fff',
  }
})

const handleLoad = () => {
  loading.value = false
}

const handleClose = () => {
  emit('close')
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

const handleDownload = () => {
  const link = document.createElement('a')
  link.href = props.fileUrl
  link.download = props.file.name
  link.click()
}
</script>

<style scoped>
.document-preview-dialog :deep(.el-dialog__body) {
  padding: 0;
  background: var(--el-fill-color-lighter);
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

.document-container {
  width: 100%;
  min-height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.document-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--el-text-color-secondary);
  padding: 60px 0;
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

iframe {
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

/* Fullscreen mode adjustments */
.document-preview-dialog.is-fullscreen :deep(.el-dialog__body) {
  padding: 16px;
}
</style>
