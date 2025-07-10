/**
 * Simple markdown rendering utilities
 * Complex Mermaid handling is now in MarkdownRenderer component
 */

// Render cache for performance
const renderCache = new Map<string, string>()

/**
 * Escape HTML characters for safe embedding
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Calculate content statistics
 */
function calculateStats(content: string): { characters: number; words: number; lines: number } {
  const characters = content.length
  const words = content.trim() ? content.trim().split(/\s+/).length : 0
  const lines = content.split('\n').length

  return { characters, words, lines }
}

/**
 * Setup scroll synchronization between two elements
 */
function setupScrollSync(
  sourceElement: HTMLElement,
  targetElement: HTMLElement
): (() => void) | null {
  if (!sourceElement || !targetElement) return null

  let isScrolling = false

  const handleSourceScroll = () => {
    if (isScrolling) return
    isScrolling = true

    const sourceScrollTop = sourceElement.scrollTop
    const sourceScrollHeight = sourceElement.scrollHeight - sourceElement.clientHeight
    const scrollPercentage = sourceScrollHeight > 0 ? sourceScrollTop / sourceScrollHeight : 0

    const targetScrollHeight = targetElement.scrollHeight - targetElement.clientHeight
    const targetScrollTop = targetScrollHeight * scrollPercentage

    targetElement.scrollTop = targetScrollTop

    requestAnimationFrame(() => {
      isScrolling = false
    })
  }

  const handleTargetScroll = () => {
    if (isScrolling) return
    isScrolling = true

    const targetScrollTop = targetElement.scrollTop
    const targetScrollHeight = targetElement.scrollHeight - targetElement.clientHeight
    const scrollPercentage = targetScrollHeight > 0 ? targetScrollTop / targetScrollHeight : 0

    const sourceScrollHeight = sourceElement.scrollHeight - sourceElement.clientHeight
    const sourceScrollTop = sourceScrollHeight * scrollPercentage

    sourceElement.scrollTop = sourceScrollTop

    requestAnimationFrame(() => {
      isScrolling = false
    })
  }

  // Add event listeners
  sourceElement.addEventListener('scroll', handleSourceScroll, { passive: true })
  targetElement.addEventListener('scroll', handleTargetScroll, { passive: true })

  // Return cleanup function
  return () => {
    sourceElement.removeEventListener('scroll', handleSourceScroll)
    targetElement.removeEventListener('scroll', handleTargetScroll)
  }
}

/**
 * Create debounced function
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func(...args)
      timeout = null
    }, wait)
  }
}

/**
 * Clear the render cache
 */
function clearRenderCache(): void {
  renderCache.clear()
}

/**
 * Composable hook for clipboard/markdown utilities
 */
export function useClipboard() {
  return {
    calculateStats,
    setupScrollSync,
    debounce,
    clearRenderCache,
    escapeHtml,
  }
}
