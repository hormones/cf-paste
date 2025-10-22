<template>
  <div class="media-content-wrapper" :class="{ 'is-audio': isAudio }">
    <!-- Type-specific action buttons (rendered in parent's header via Teleport) -->
    <Teleport v-if="!isMobile" :to="actionsSlot" :disabled="!mounted || !actionsSlot">
      <el-button v-if="isVideo" :icon="FullScreen" @click="toggleFullscreen">
        {{ fullscreen ? t('common.buttons.exitFullscreen') : t('common.buttons.fullscreen') }}
      </el-button>
    </Teleport>

    <!-- Video player -->
    <video
      v-if="isVideo"
      ref="mediaRef"
      class="media-element"
      :src="fileUrl"
      controls
      preload="metadata"
      @loadedmetadata="handleLoadedMetadata"
      @error="handleError"
    >
      {{ t('file.previewUnsupported') }}
    </video>

    <!-- Audio player -->
    <audio
      v-else
      ref="mediaRef"
      class="media-element"
      :src="fileUrl"
      controls
      preload="metadata"
      @loadedmetadata="handleLoadedMetadata"
      @error="handleError"
    >
      {{ t('file.previewUnsupported') }}
    </audio>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'
import type { PreviewResizePayload } from '@/types/preview'
import { FullScreen } from '@element-plus/icons-vue'
import type { FileInfo } from '@/types'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{
  file: FileInfo
  fileUrl: string
  category: 'video' | 'audio'
  fullscreen: boolean
}>()

const emit = defineEmits<{
  loaded: []
  error: [string]
  meta: [string]
  resize: [PreviewResizePayload | null]
}>()

const { t } = useI18n()

// Inject toggle function from parent
const toggleFullscreen = inject<() => void>('toggleFullscreen', () => {})

const actionsSlot = inject<Ref<HTMLElement | null>>('actionsSlot', ref(null))
const isMobile = inject<Ref<boolean>>('isMobilePreview', ref(false))

// Component state
const mediaRef = ref<HTMLVideoElement | HTMLAudioElement>()
const mounted = ref(false)
const duration = ref(0)

const isVideo = computed(() => props.category === 'video')
const isAudio = computed(() => props.category === 'audio')

onMounted(() => {
  mounted.value = true
})

onBeforeUnmount(() => {
  // Pause media before unmounting
  if (mediaRef.value && !mediaRef.value.paused) {
    mediaRef.value.pause()
  }
  emit('resize', null)
})

// Event handlers
const handleLoadedMetadata = (event: Event) => {
  const media = event.target as HTMLVideoElement | HTMLAudioElement

  if (media.duration && isFinite(media.duration)) {
    duration.value = media.duration
    emit('meta', formatDuration(media.duration))
  }

  if (!isMobile.value) {
    if (isVideo.value && media instanceof HTMLVideoElement) {
      const viewportWidth = window.innerWidth || media.videoWidth || 0
      const viewportHeight = window.innerHeight || media.videoHeight || 0
      const widthPixels = Math.round(
        Math.max(480, Math.min(media.videoWidth || viewportWidth, viewportWidth * 0.85))
      )
      const heightPixels = Math.round(
        Math.max(280, Math.min(media.videoHeight || widthPixels / (16 / 9), viewportHeight * 0.75))
      )
      const payload: PreviewResizePayload = {
        width: `${widthPixels}px`,
        minHeight: '300px',
        maxHeight: `${heightPixels}px`,
      }
      emit('resize', payload)
    } else {
      const audioPayload: PreviewResizePayload = {
        width: 520,
        minHeight: 120,
        maxHeight: 200,
      }
      emit('resize', audioPayload)
    }
  }

  emit('loaded')
}

const handleError = () => {
  emit('error', t('file.previewLoadError'))
  emit('resize', null)
}

// Format duration as HH:MM:SS or MM:SS
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
.media-content-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  background: #000;
}

.media-content-wrapper.is-audio {
  background: var(--el-fill-color);
  padding: 24px;
}

.media-element {
  max-width: 100%;
  max-height: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

audio.media-element {
  width: 100%;
  max-width: 450px;
}
</style>
