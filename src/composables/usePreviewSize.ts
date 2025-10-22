import { ref, computed, watch } from 'vue'
import type { PreviewCategory } from 'shared/utils/mime'

export interface ContentSize {
  width: number
  height: number
}

export interface DialogSize {
  width: string
  height: string
}

export interface PreviewSizeOptions {
  category: PreviewCategory
  contentSize?: ContentSize
  scale?: number
}

/**
 * Smart preview size calculator
 * Implements content-aware sizing based on file type and actual dimensions
 */
export function usePreviewSize(options: PreviewSizeOptions) {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  const contentSize = ref<ContentSize | undefined>(options.contentSize)
  const scale = ref(options.scale || 1)

  // Size calculation strategies for different content types
  const strategies = {
    image: () => {
      if (!contentSize.value) {
        return { width: '600px', height: '400px' }
      }

      const { width, height } = contentSize.value
      let targetWidth = width * scale.value
      let targetHeight = height * scale.value

      // Max constraints based on viewport
      const maxWidth = viewportWidth * 0.9
      const maxHeight = viewportHeight * 0.85

      // Maintain aspect ratio while fitting viewport
      if (targetWidth > maxWidth) {
        const ratio = maxWidth / targetWidth
        targetWidth = maxWidth
        targetHeight *= ratio
      }

      if (targetHeight > maxHeight) {
        const ratio = maxHeight / targetHeight
        targetHeight = maxHeight
        targetWidth *= ratio
      }

      // Min constraints to prevent too small dialogs
      targetWidth = Math.max(400, Math.min(targetWidth, maxWidth))
      targetHeight = Math.max(300, Math.min(targetHeight, maxHeight))

      return {
        width: `${Math.round(targetWidth)}px`,
        height: `${Math.round(targetHeight)}px`,
      }
    },

    pdf: () => {
      // PDF always uses large fixed size for comfortable reading
      const width = Math.min(1200, viewportWidth * 0.9)
      const height = viewportHeight * 0.85

      return {
        width: `${width}px`,
        height: `${height}px`,
      }
    },

    video: () => {
      // Video uses 16:9 aspect ratio with medium-large size
      const width = Math.min(960, viewportWidth * 0.85)
      const height = Math.min(width / (16 / 9), viewportHeight * 0.8)

      return {
        width: `${width}px`,
        height: `${height}px`,
      }
    },

    audio: () => {
      // Audio uses compact fixed size
      return {
        width: '500px',
        height: '200px',
      }
    },

    text: () => {
      // Text uses fixed width with dynamic height based on content
      const width = Math.min(800, viewportWidth * 0.8)
      let height = contentSize.value?.height || 500

      // Clamp height
      const minHeight = 400
      const maxHeight = viewportHeight * 0.8
      height = Math.max(minHeight, Math.min(height, maxHeight))

      return {
        width: `${width}px`,
        height: `${height}px`,
      }
    },

    markdown: () => {
      // Markdown same as text
      return strategies.text()
    },

    unsupported: () => {
      return {
        width: '500px',
        height: '300px',
      }
    },
  }

  const dialogSize = computed<DialogSize>(() => {
    const strategy = strategies[options.category] || strategies.unsupported
    return strategy()
  })

  const updateContentSize = (newSize: ContentSize) => {
    contentSize.value = newSize
  }

  const updateScale = (newScale: number) => {
    scale.value = newScale
  }

  const zoom = (factor: number) => {
    scale.value = Math.max(0.1, Math.min(scale.value * factor, 5))
  }

  return {
    dialogSize,
    contentSize,
    scale,
    updateContentSize,
    updateScale,
    zoom,
  }
}

/**
 * Hook for measuring content dimensions
 * Used for content-aware sizing
 */
export function useContentMeasurement() {
  const contentRef = ref<HTMLElement>()
  const measuredSize = ref<ContentSize>({ width: 0, height: 0 })

  const measureImage = (img: HTMLImageElement): ContentSize => {
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
    }
  }

  const measureElement = (el?: HTMLElement): ContentSize => {
    if (!el) return { width: 0, height: 0 }

    return {
      width: el.scrollWidth,
      height: el.scrollHeight,
    }
  }

  watch(
    contentRef,
    (el) => {
      if (el) {
        measuredSize.value = measureElement(el)
      }
    },
    { immediate: true }
  )

  return {
    contentRef,
    measuredSize,
    measureImage,
    measureElement,
  }
}
