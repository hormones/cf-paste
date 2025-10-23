import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Ref } from 'vue'
import type { PreviewCategory } from 'shared/utils/mime'

const MOBILE_BREAKPOINT = 768
const MIN_DIALOG_WIDTH = 360
const MIN_DIALOG_HEIGHT = 240
const MIN_BODY_HEIGHT = 200
const CONTENT_VERTICAL_GAP = 176

const FALLBACK_DIMENSIONS = { width: 720, height: 540 }

const CATEGORY_DIMENSIONS: Record<PreviewCategory, { width: number; height: number }> = {
  image: { width: 960, height: 720 },
  pdf: { width: 1040, height: 780 },
  video: { width: 1040, height: 720 },
  audio: { width: 600, height: 320 },
  markdown: { width: 880, height: 640 },
  text: { width: 880, height: 640 },
  unsupported: { width: 640, height: 420 },
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export const usePreviewSizing = (params: { category: Ref<PreviewCategory>; fullscreen: Ref<boolean> }) => {
  const viewport = ref({ width: 1024, height: 768 })

  const updateViewport = () => {
    if (typeof window === 'undefined') return
    viewport.value = {
      width: window.innerWidth || viewport.value.width,
      height: window.innerHeight || viewport.value.height,
    }
  }

  if (typeof window !== 'undefined') {
    updateViewport()
  }

  onMounted(() => {
    if (typeof window === 'undefined') return
    window.addEventListener('resize', updateViewport)
  })

  onBeforeUnmount(() => {
    if (typeof window === 'undefined') return
    window.removeEventListener('resize', updateViewport)
  })

  const isMobile = computed(() => viewport.value.width <= MOBILE_BREAKPOINT)

  const preferredSize = computed(() => CATEGORY_DIMENSIONS[params.category.value] || FALLBACK_DIMENSIONS)

  const maxDialogWidth = computed(() => Math.max(MIN_DIALOG_WIDTH, viewport.value.width * 0.9))
  const maxDialogHeight = computed(() => Math.max(MIN_DIALOG_HEIGHT, viewport.value.height * 0.9))

  const resolvedDialogWidth = computed(() => {
    if (params.fullscreen.value) return viewport.value.width
    return clamp(preferredSize.value.width, MIN_DIALOG_WIDTH, maxDialogWidth.value)
  })

  const resolvedDialogHeight = computed(() => {
    if (params.fullscreen.value) return viewport.value.height
    return clamp(preferredSize.value.height, MIN_DIALOG_HEIGHT, maxDialogHeight.value)
  })

  const dialogWidth = computed(() => {
    if (params.fullscreen.value) return '100%'
    return `${Math.round(resolvedDialogWidth.value)}px`
  })

  const dialogStyle = computed(() => {
    if (params.fullscreen.value) {
      return {
        width: '100%',
        height: '100%',
        margin: '0',
        maxWidth: '100vw',
        maxHeight: '100vh',
      }
    }
    return {
      width: `${Math.round(resolvedDialogWidth.value)}px`,
      maxWidth: '90vw',
      maxHeight: '90vh',
    }
  })

  const bodyStyle = computed(() => {
    if (params.fullscreen.value) {
      return {
        height: `calc(100vh - ${CONTENT_VERTICAL_GAP}px)`,
        minHeight: `${MIN_BODY_HEIGHT}px`,
        overflow: 'auto',
      }
    }

    const availableHeight = Math.min(resolvedDialogHeight.value, maxDialogHeight.value)
    const allowed = clamp(availableHeight - CONTENT_VERTICAL_GAP, MIN_BODY_HEIGHT, maxDialogHeight.value - CONTENT_VERTICAL_GAP)

    return {
      maxHeight: `${Math.round(allowed)}px`,
      minHeight: `${MIN_BODY_HEIGHT}px`,
      overflow: 'auto',
    }
  })

  return {
    dialogWidth,
    dialogStyle,
    bodyStyle,
    isMobile,
  }
}
