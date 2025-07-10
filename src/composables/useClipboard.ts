import { marked } from 'marked'
import hljs from 'highlight.js'
import type { Ref } from 'vue'

// Content cache to avoid redundant rendering
const renderCache = new Map<string, string>()

/**
 * Clipboard markdown utilities composable
 * Provides markdown rendering, stats calculation, scroll sync and debounce utilities
 */
export function useClipboard() {
  // Configure marked with GFM support
  marked.setOptions({
    gfm: true,
    breaks: true
  })

    // Setup custom renderer for code highlighting
  const renderer = {
    code({ text, lang }: { text: string; lang?: string; escaped?: boolean }) {
      try {
        let result: { value: string }

        if (lang && typeof lang === 'string' && hljs.getLanguage(lang)) {
          result = hljs.highlight(text, { language: lang, ignoreIllegals: true }) as { value: string }
          return `<pre><code class="hljs language-${lang}">${result.value}</code></pre>`
        } else {
          result = hljs.highlightAuto(text) as { value: string }
          return `<pre><code class="hljs">${result.value}</code></pre>`
        }
      } catch (error) {
        // Fallback to escaped plain text if highlighting fails
        const escapedText = text.replace(/[&<>"']/g, (char) => {
          const escapeMap: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
          }
          return escapeMap[char] || char
        })
        return `<pre><code>${escapedText}</code></pre>`
      }
    }
  }

  // Use the custom renderer
  marked.use({ renderer })

  /**
   * Render markdown content to HTML with caching
   * @param content - Raw markdown content
   * @returns Rendered HTML string
   */
  const renderMarkdown = (content: string): string => {
    if (!content.trim()) {
      return ''
    }

    // Check cache first
    const cached = renderCache.get(content)
    if (cached !== undefined) {
      return cached
    }

    try {
      const html = marked.parse(content)

      // Cache the result (limit cache size to prevent memory issues)
      if (renderCache.size >= 50) {
        const firstKey = renderCache.keys().next().value
        if (firstKey) {
          renderCache.delete(firstKey)
        }
      }
      renderCache.set(content, html as string)

      return html as string
    } catch (error) {
      console.warn('Markdown rendering failed:', error)
      // Fallback to escaped plain text
      return content.replace(/[&<>"']/g, (char) => {
        const escapeMap: Record<string, string> = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        }
        return escapeMap[char] || char
      })
    }
  }

  /**
   * Calculate content statistics
   * @param content - Text content to analyze
   * @returns Object with character and word counts
   */
  const calculateStats = (content: string) => {
    const trimmed = content.trim()

    return {
      characters: content.length,
      charactersNoSpaces: content.replace(/\s/g, '').length,
      words: trimmed ? trimmed.split(/\s+/).length : 0,
      lines: content.split('\n').length
    }
  }

  /**
   * Setup bidirectional scroll synchronization between editor and preview
   * @param editorElement - Editor DOM element or ref
   * @param previewElement - Preview DOM element or ref
   * @returns Cleanup function to remove event listeners
   */
  const setupScrollSync = (
    editorElement: HTMLElement | Ref<HTMLElement | null>,
    previewElement: HTMLElement | Ref<HTMLElement | null>
  ) => {
    let isEditorScrolling = false
    let isPreviewScrolling = false
    let scrollTimer: number | null = null

    const debouncedResetScrollFlags = debounce(() => {
      isEditorScrolling = false
      isPreviewScrolling = false
    }, 100)

    const syncScroll = (source: HTMLElement, target: HTMLElement, isSourceEditor: boolean) => {
      if (!source || !target) return

      const sourceScrollTop = source.scrollTop
      const sourceScrollHeight = source.scrollHeight - source.clientHeight
      const targetScrollHeight = target.scrollHeight - target.clientHeight

      if (sourceScrollHeight <= 0 || targetScrollHeight <= 0) return

      const scrollRatio = sourceScrollTop / sourceScrollHeight
      const targetScrollTop = scrollRatio * targetScrollHeight

      // Set scroll flags to prevent infinite loop
      if (isSourceEditor) {
        isEditorScrolling = true
      } else {
        isPreviewScrolling = true
      }

      target.scrollTop = targetScrollTop
      debouncedResetScrollFlags()
    }

    // Helper function to get actual DOM element from element or ref
    const getElement = (elementOrRef: HTMLElement | Ref<HTMLElement | null>): HTMLElement | null => {
      if ('value' in elementOrRef) {
        return elementOrRef.value
      }
      return elementOrRef
    }

    const editorEl = getElement(editorElement)
    const previewEl = getElement(previewElement)

    const handleEditorScroll = () => {
      if (isPreviewScrolling) return
      if (!editorEl || !previewEl) return

      if (scrollTimer) {
        cancelAnimationFrame(scrollTimer)
      }

      scrollTimer = requestAnimationFrame(() => {
        syncScroll(editorEl, previewEl, true)
      })
    }

    const handlePreviewScroll = () => {
      if (isEditorScrolling) return
      if (!editorEl || !previewEl) return

      if (scrollTimer) {
        cancelAnimationFrame(scrollTimer)
      }

      scrollTimer = requestAnimationFrame(() => {
        syncScroll(previewEl, editorEl, false)
      })
    }

    // Setup event listeners
    const setupListeners = () => {
      if (editorEl) {
        editorEl.addEventListener('scroll', handleEditorScroll, { passive: true })
      }
      if (previewEl) {
        previewEl.addEventListener('scroll', handlePreviewScroll, { passive: true })
      }
    }

    // Cleanup function
    const cleanup = () => {
      if (scrollTimer) {
        cancelAnimationFrame(scrollTimer)
      }
      if (editorEl) {
        editorEl.removeEventListener('scroll', handleEditorScroll)
      }
      if (previewEl) {
        previewEl.removeEventListener('scroll', handlePreviewScroll)
      }
    }

    // Setup listeners when refs are available
    setupListeners()

    return cleanup
  }

  /**
   * Create a debounced version of a function
   * @param fn - Function to debounce
   * @param delay - Delay in milliseconds
   * @returns Debounced function
   */
  const debounce = <T extends (...args: any[]) => any>(fn: T, delay: number): T => {
    let timeoutId: number | null = null

    return ((...args: any[]) => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }

      timeoutId = window.setTimeout(() => {
        fn(...args)
        timeoutId = null
      }, delay)
    }) as T
  }

  /**
   * Clear the render cache
   */
  const clearRenderCache = () => {
    renderCache.clear()
  }

  return {
    renderMarkdown,
    calculateStats,
    setupScrollSync,
    debounce,
    clearRenderCache
  }
}

export type { } from '@/types'
