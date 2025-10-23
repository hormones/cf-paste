<template>
  <div class="image-content-wrapper">
    <Teleport :to="actionsSlot" :disabled="!mounted || !actionsSlot">
      <el-button :icon="ZoomOut" @click="handleZoom(0.8)" :disabled="scale <= 0.2">
        {{ displayScale }}%
      </el-button>
      <el-button :icon="ZoomIn" @click="handleZoom(1.25)" :disabled="scale >= 5" />
      <el-button :icon="RefreshLeft" @click="handleReset" />
    </Teleport>

    <img
      ref="imageRef"
      class="image-element"
      :src="fileUrl"
      :alt="file.name"
      :style="imageStyle"
      @load="handleLoad"
      @error="handleError"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onBeforeUnmount, watch } from 'vue'
import type { Ref } from 'vue'
import { ZoomIn, ZoomOut, RefreshLeft } from '@element-plus/icons-vue'
import type { FileInfo } from '@/types'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{
  file: FileInfo
  fileUrl: string
}>()

const emit = defineEmits<{
  loaded: [payload?: { size: { width: number; height: number } }]
  error: [string]
  meta: [string]
}>()

const { t } = useI18n()

const actionsSlot = inject<Ref<HTMLElement | null>>('actionsSlot', ref(null))

const imageRef = ref<HTMLImageElement>()
const scale = ref(1)
const mounted = ref(false)
const offset = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const dragPointerId = ref<number | null>(null)
const dragStart = ref({ x: 0, y: 0 })
const dragOffsetStart = ref({ x: 0, y: 0 })

onMounted(() => {
  mounted.value = true
})

const displayScale = computed(() => Math.round(scale.value * 100))

const imageStyle = computed(() => ({
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain' as const,
  transform: `translate3d(${offset.value.x}px, ${offset.value.y}px, 0) scale(${scale.value})`,
  transformOrigin: 'center',
  transition: isDragging.value ? 'none' : 'transform 0.3s ease',
  cursor: scale.value > 1 ? (isDragging.value ? 'grabbing' : 'grab') : 'default',
  borderRadius: '8px',
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
}))

const handleLoad = (event: Event) => {
  const img = event.target as HTMLImageElement
  const size = {
    width: img.naturalWidth,
    height: img.naturalHeight,
  }

  emit('loaded', { size })
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
  offset.value = { x: 0, y: 0 }
}

const stopDragging = () => {
  if (!isDragging.value) return
  if (dragPointerId.value !== null && imageRef.value?.hasPointerCapture(dragPointerId.value)) {
    imageRef.value.releasePointerCapture(dragPointerId.value)
  }
  isDragging.value = false
  dragPointerId.value = null
}

const handlePointerDown = (event: PointerEvent) => {
  if (scale.value <= 1 || !event.isPrimary || !imageRef.value) return
  if (event.pointerType === 'mouse' && event.button !== 0) return
  event.preventDefault()
  dragPointerId.value = event.pointerId
  dragStart.value = { x: event.clientX, y: event.clientY }
  dragOffsetStart.value = { ...offset.value }
  imageRef.value.setPointerCapture(event.pointerId)
  isDragging.value = true
}

const handlePointerMove = (event: PointerEvent) => {
  if (!isDragging.value || dragPointerId.value === null || event.pointerId !== dragPointerId.value) return
  event.preventDefault()
  const deltaX = event.clientX - dragStart.value.x
  const deltaY = event.clientY - dragStart.value.y
  offset.value = {
    x: dragOffsetStart.value.x + deltaX,
    y: dragOffsetStart.value.y + deltaY,
  }
}

const handlePointerUp = (event: PointerEvent) => {
  if (!isDragging.value || event.pointerId !== dragPointerId.value) return
  event.preventDefault()
  stopDragging()
}

const handlePointerCancel = () => {
  stopDragging()
}

watch(scale, (value, oldValue) => {
  if (value <= 1) {
    offset.value = { x: 0, y: 0 }
    stopDragging()
    return
  }
  if (!isFinite(oldValue) || oldValue === 0) return
  const currentOffset = offset.value
  const ratio = value / oldValue
  offset.value = {
    x: currentOffset.x * ratio,
    y: currentOffset.y * ratio,
  }
})

onBeforeUnmount(() => {
  stopDragging()
})
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
  user-select: none;
  touch-action: none;
}
</style>
