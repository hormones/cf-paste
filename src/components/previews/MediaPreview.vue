<template>
  <el-dialog
    :model-value="true"
    :width="dialogWidth"
    :fullscreen="isFullscreen"
    class="media-preview-dialog"
    append-to-body
    destroy-on-close
    @close="handleClose"
  >
    <template #header>
      <div class="preview-header">
        <span class="preview-title">{{ file.name }}</span>
        <div class="preview-actions">
          <el-button-group size="small">
            <el-button
              v-if="isVideo"
              :icon="FullScreen"
              @click="toggleFullscreen"
            >
              {{ isFullscreen ? t('common.buttons.exitFullscreen') : t('common.buttons.fullscreen') }}
            </el-button>
            <el-button :icon="Download" @click="handleDownload">
              {{ t('common.buttons.download') }}
            </el-button>
          </el-button-group>
        </div>
      </div>
    </template>

    <div class="media-container" :class="{ 'is-audio': !isVideo }">
      <video
        v-if="isVideo"
        ref="mediaRef"
        :src="fileUrl"
        :style="mediaStyle"
        controls
        preload="metadata"
        @loadedmetadata="handleMediaLoad"
      >
        {{ t('file.previewUnsupported') }}
      </video>

      <audio
        v-else
        ref="mediaRef"
        :src="fileUrl"
        controls
        preload="metadata"
        @loadedmetadata="handleMediaLoad"
      >
        {{ t('file.previewUnsupported') }}
      </audio>

      <div v-if="loading" class="media-loading">
        <el-icon class="rotating" :size="32">
          <Loading />
        </el-icon>
        <span>{{ t('file.previewLoading') }}</span>
      </div>
    </div>

    <template #footer>
      <div class="preview-footer">
        <span class="file-meta">
          <template v-if="duration">
            {{ formatDuration(duration) }} •
          </template>
          {{ Utils.humanReadableSize(file.size) }} •
          {{ file.contentType || (isVideo ? 'video/*' : 'audio/*') }}
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
  category: 'video' | 'audio'
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const loading = ref(true)
const isFullscreen = ref(false)
const mediaRef = ref<HTMLVideoElement | HTMLAudioElement>()
const duration = ref(0)

const isVideo = computed(() => props.category === 'video')

// Video uses 16:9 aspect ratio with medium-large size
// Audio uses compact size
const dialogWidth = computed(() => {
  if (isFullscreen.value) return '100%'

  const viewportWidth = window.innerWidth

  if (isVideo.value) {
    return `${Math.min(960, viewportWidth * 0.85)}px`
  } else {
    return '520px'
  }
})

const mediaStyle = computed(() => {
  if (!isVideo.value) return {}

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  if (isFullscreen.value) {
    return {
      width: '100%',
      height: 'calc(100vh - 140px)',
      objectFit: 'contain' as const,
    }
  }

  const width = Math.min(960, viewportWidth * 0.85)
  const height = Math.min(width / (16 / 9), viewportHeight * 0.75)

  return {
    width: '100%',
    maxWidth: `${width}px`,
    maxHeight: `${height}px`,
    objectFit: 'contain' as const,
  }
})

const handleMediaLoad = (event: Event) => {
  const media = event.target as HTMLVideoElement | HTMLAudioElement
  if (media.duration && isFinite(media.duration)) {
    duration.value = media.duration
  }
  loading.value = false
}

const handleClose = () => {
  // Pause media before closing
  if (mediaRef.value && !mediaRef.value.paused) {
    mediaRef.value.pause()
  }
  emit('close')
}

const toggleFullscreen = () => {
  if (isVideo.value && mediaRef.value) {
    if (!document.fullscreenElement) {
      mediaRef.value.requestFullscreen?.()
      isFullscreen.value = true
    } else {
      document.exitFullscreen?.()
      isFullscreen.value = false
    }
  }
}

const handleDownload = () => {
  const link = document.createElement('a')
  link.href = props.fileUrl
  link.download = props.file.name
  link.click()
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}
</script>

<style scoped>
.media-preview-dialog :deep(.el-dialog__body) {
  padding: 16px;
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

.media-container {
  width: 100%;
  min-height: 300px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  border-radius: 8px;
  background: #000;
}

.media-container.is-audio {
  min-height: 120px;
  background: var(--el-fill-color);
  padding: 24px;
}

video,
audio {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

audio {
  width: 100%;
  max-width: 450px;
}

.media-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #fff;
  z-index: 10;
}

.media-container.is-audio .media-loading {
  color: var(--el-text-color-secondary);
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
