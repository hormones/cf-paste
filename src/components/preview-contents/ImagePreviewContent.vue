<template>
  <div class="image-content-wrapper">
    <!-- Type-specific action buttons (rendered in parent's header via Teleport) -->
    <Teleport :to="actionsSlot" :disabled="!mounted || !actionsSlot">
      <template v-if="fullscreen">
        <el-button :icon="ZoomOut" @click="handleZoom(0.8)" :disabled="scale <= 0.2">
          {{ displayScale }}%
        </el-button>
        <el-button :icon="ZoomIn" @click="handleZoom(1.25)" :disabled="scale >= 5" />
        <el-button :icon="RefreshLeft" @click="handleReset" />
      </template>
      <el-button v-if="!isMobile" :icon="FullScreen" @click="toggleFullscreen">
        {{ fullscreen ? t('common.buttons.exitFullscreen') : t('common.buttons.fullscreen') }}
      </el-button>
    </Teleport>

    <!-- Image element -->
    <img
      ref="imageRef"
      class="image-element"
      :src="fileUrl"
      :alt="file.name"
      :style="imageStyle"
      @load="handleLoad"
      @error="handleError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, watch } from 'vue'
import type { Ref } from 'vue'
import { ZoomIn, ZoomOut, FullScreen, RefreshLeft } from '@element-plus/icons-vue'
import type { FileInfo } from '@/types'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{
  file: FileInfo
  fileUrl: string
  fullscreen: boolean
}>()

const emit = defineEmits<{
  loaded: [payload?: { size: { width: number; height: number } }]
  error: [string]
  meta: [string]
}>()

const { t } = useI18n()

// Inject toggle function from parent
const toggleFullscreen = inject<() => void>('toggleFullscreen', () => {})

const actionsSlot = inject<Ref<HTMLElement | null>>('actionsSlot', ref(null))
const isMobile = inject<Ref<boolean>>('isMobilePreview', ref(false))

// Component state
const imageRef = ref<HTMLImageElement>()
const scale = ref(1)
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

const displayScale = computed(() => Math.round(scale.value * 100))

// Image styling with scale transform
const imageStyle = computed(() => ({
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain' as const,
  transform: props.fullscreen ? `scale(${scale.value})` : 'none',
  transformOrigin: 'center',
  transition: 'transform 0.3s ease',
  cursor: props.fullscreen && scale.value > 1 ? 'grab' : 'default',
  borderRadius: '8px',
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
}))

// Event handlers
const handleLoad = (event: Event) => {
  const img = event.target as HTMLImageElement
  const size = {
    width: img.naturalWidth,
    height: img.naturalHeight,
  }

  emit('loaded', { size })

  // Provide metadata for footer
  emit('meta', `${size.width} × ${size.height}`)
}

const handleError = () => {
  emit('error', t('file.previewLoadError'))
}

const handleZoom = (factor: number) => {
  scale.value = Math.max(0.2, Math.min(scale.value * factor, 5))
}

const handleReset = () => {
  scale.value = 1
}

// Reset scale when exiting fullscreen
watch(
  () => props.fullscreen,
  (isFullscreen) => {
    if (!isFullscreen) {
      scale.value = 1
    }
  }
)
</script>

<style scoped>
.image-content-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.image-element {
  display: block;
}
</style>
