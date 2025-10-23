<template>
  <div class="media-content-wrapper" :class="{ 'is-audio': isAudio }">
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { FileInfo } from '@/types'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{
  file: FileInfo
  fileUrl: string
  category: 'video' | 'audio'
}>()

const emit = defineEmits<{
  loaded: [payload?: { size: { width: number; height: number } }]
  error: [string]
  meta: [string]
}>()

const { t } = useI18n()

// Component state
const mediaRef = ref<HTMLVideoElement | HTMLAudioElement>()
const isVideo = computed(() => props.category === 'video')
const isAudio = computed(() => props.category === 'audio')

const pauseMedia = () => {
  if (mediaRef.value && !mediaRef.value.paused) {
    mediaRef.value.pause()
  }
}

onMounted(() => {
  if (mediaRef.value) {
    mediaRef.value.addEventListener('ended', pauseMedia)
  }
})

onBeforeUnmount(() => {
  pauseMedia()
  if (mediaRef.value) {
    mediaRef.value.removeEventListener('ended', pauseMedia)
  }
})

// Event handlers
const handleLoadedMetadata = (event: Event) => {
  const media = event.target as HTMLVideoElement | HTMLAudioElement

  if (media.duration && isFinite(media.duration)) {
    emit('meta', formatDuration(media.duration))
  }

  emit('loaded')
}

const handleError = () => {
  emit('error', t('file.previewLoadError'))
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
