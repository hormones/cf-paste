<template>
  <div
    ref="rendererRef"
    class="markdown-renderer"
    :class="{ 'is-rendering': isRendering, 'has-error': renderError }"
    v-html="renderedHtml"
  />
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import css from 'highlight.js/lib/languages/css'
import html from 'highlight.js/lib/languages/xml' // HTML is under xml
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import typescript from 'highlight.js/lib/languages/typescript'

// Register only the languages you need
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', html)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('typescript', typescript)

// Define props with strict typing
interface Props {
  content: string
  immediate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  immediate: true
})

// Define emits
const emit = defineEmits<{
  rendered: [html: string]
  error: [error: Error]
}>()

// Core state
const rendererRef = ref<HTMLElement>()
const renderedHtml = ref('')
const isRendering = ref(false)
const renderError = ref(false)

// Mermaid state
let mermaid: any = null
let mermaidInitialized = false
const mermaidQueue: Array<{ id: string; code: string }> = []
let isProcessingQueue = false

/**
 * Initialize Mermaid library with secure configuration
 */
async function initializeMermaid(): Promise<void> {
  if (mermaidInitialized) return

  try {
    const mermaidModule = await import('mermaid')
    mermaid = mermaidModule.default

    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit',
      logLevel: 'error'
    })

    mermaidInitialized = true
    console.log('✅ Mermaid initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize Mermaid:', error)
    throw error
  }
}

/**
 * Configure marked with syntax highlighting and Mermaid support
 */
function configureMarked(): void {
  const renderer = new marked.Renderer()

    // Enhanced code block renderer with Mermaid detection
  renderer.code = function({ text, lang }: { text: string; lang?: string }): string {
    // Handle Mermaid diagrams
    if (lang === 'mermaid') {
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`

      // Queue for async processing
      mermaidQueue.push({ id, code: text })

      // Return placeholder with data attribute
      return `<div id="${id}" class="mermaid-container" data-mermaid-code="${escapeHtml(text)}">
        <div class="mermaid-loading">🔄 Rendering diagram...</div>
      </div>`
    }

    // Handle regular code blocks with syntax highlighting
    if (lang && hljs.getLanguage(lang)) {
      try {
        const highlighted = hljs.highlight(text, { language: lang }).value
        return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`
      } catch (error) {
        console.warn(`Syntax highlighting failed for language: ${lang}`, error)
      }
    }

    // Fallback for unsupported languages
    return `<pre><code class="hljs">${escapeHtml(text)}</code></pre>`
  }

  // Apply configuration
  marked.setOptions({
    renderer,
    gfm: true,
    breaks: true
  })
}

/**
 * Escape HTML characters for safe embedding
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Process Mermaid diagram queue sequentially
 */
async function processMermaidQueue(): Promise<void> {
  if (isProcessingQueue || mermaidQueue.length === 0) return

  isProcessingQueue = true
  console.log(`🚀 Processing ${mermaidQueue.length} Mermaid diagrams`)

  try {
    // Ensure Mermaid is initialized
    if (!mermaidInitialized) {
      await initializeMermaid()
    }

    // Process each diagram
    for (const { id, code } of mermaidQueue.splice(0)) {
      await renderMermaidDiagram(id, code)

      // Small delay to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    console.log('✅ All Mermaid diagrams processed successfully')
  } catch (error) {
    console.error('❌ Mermaid queue processing failed:', error)
  } finally {
    isProcessingQueue = false
  }
}

/**
 * Render individual Mermaid diagram
 */
async function renderMermaidDiagram(id: string, code: string): Promise<void> {
  const element = document.getElementById(id)
  if (!element) {
    console.warn(`⚠️ Mermaid element not found: ${id}`)
    return
  }

  try {
    // Pre-calculate container dimensions to prevent layout shift
    const tempContainer = document.createElement('div')
    tempContainer.style.visibility = 'hidden'
    tempContainer.style.position = 'absolute'
    tempContainer.style.top = '-9999px'
    tempContainer.style.width = getComputedStyle(element).width
    document.body.appendChild(tempContainer)

    // Generate SVG in hidden container first
    const { svg } = await mermaid.render(`${id}-svg`, code)

    // Create a wrapper to maintain aspect ratio
    const svgWrapper = document.createElement('div')
    svgWrapper.className = 'mermaid-svg-wrapper'
    svgWrapper.innerHTML = svg

    // Extract SVG dimensions for aspect ratio calculation
    const svgElement = svgWrapper.querySelector('svg')
    if (svgElement) {
      const viewBox = svgElement.getAttribute('viewBox')
      if (viewBox) {
        const [, , width, height] = viewBox.split(' ').map(Number)
        const aspectRatio = height / width
        svgWrapper.style.paddingBottom = `${aspectRatio * 100}%`
        svgWrapper.style.position = 'relative'
        svgElement.style.position = 'absolute'
        svgElement.style.top = '0'
        svgElement.style.left = '50%'
        svgElement.style.transform = 'translateX(-50%)'
        svgElement.style.width = '100%'
        svgElement.style.height = '100%'
      }
    }

    // Cleanup temp container
    document.body.removeChild(tempContainer)

    // Update DOM with rendered diagram - single operation to minimize reflow
    element.innerHTML = ''
    element.appendChild(svgWrapper)
    element.classList.remove('mermaid-container')
    element.classList.add('mermaid-rendered')

    console.log(`✅ Mermaid diagram rendered: ${id}`)
  } catch (error) {
    console.error(`❌ Mermaid rendering failed for ${id}:`, error)

    // Show user-friendly error
    element.innerHTML = `
      <div class="mermaid-error">
        <div class="error-icon">⚠️</div>
        <div class="error-message">图表渲染失败</div>
        <details class="error-details">
          <summary>查看详情</summary>
          <pre>${escapeHtml(error instanceof Error ? error.message : String(error))}</pre>
        </details>
      </div>
    `
    element.classList.add('mermaid-error-state')
  }
}

/**
 * Main render function
 */
async function renderContent(): Promise<void> {
  if (!props.content || isRendering.value) return

  isRendering.value = true
  renderError.value = false

  try {
    // Configure marked before rendering
    configureMarked()

    // Render Markdown to HTML
    const html = await marked(props.content)
    renderedHtml.value = html

    // Wait for DOM update
    await nextTick()

    // Process Mermaid diagrams after DOM is ready
    if (mermaidQueue.length > 0) {
      // Small delay to ensure DOM stability
      setTimeout(() => {
        processMermaidQueue()
      }, 50)
    }

    emit('rendered', html)
    console.log(`📝 Content rendered (${html.length} chars, ${mermaidQueue.length} diagrams queued)`)

  } catch (error) {
    console.error('❌ Markdown rendering failed:', error)
    renderError.value = true
    emit('error', error instanceof Error ? error : new Error(String(error)))
  } finally {
    isRendering.value = false
  }
}

/**
 * Re-process Mermaid diagrams in existing DOM
 * Useful when component is moved or re-mounted
 */
async function reprocessMermaidDiagrams(): Promise<void> {
  if (!rendererRef.value) return

  const containers = rendererRef.value.querySelectorAll('.mermaid-container')
  if (containers.length === 0) return

  console.log(`🔄 Re-processing ${containers.length} Mermaid diagrams`)

  // Clear queue and rebuild from DOM
  mermaidQueue.length = 0

  containers.forEach(container => {
    const element = container as HTMLElement
    const code = element.dataset.mermaidCode

    if (code && element.id) {
      mermaidQueue.push({ id: element.id, code })

      // Reset to loading state
      element.innerHTML = '<div class="mermaid-loading">🔄 Rendering diagram...</div>'
      element.className = 'mermaid-container'
    }
  })

  // Process the rebuilt queue
  await processMermaidQueue()
}

// Watch for content changes
watch(() => props.content, renderContent, { immediate: props.immediate })

// Lifecycle hooks
onMounted(() => {
  if (props.immediate && props.content) {
    renderContent()
  }
})

onUnmounted(() => {
  // Clear any pending operations
  mermaidQueue.length = 0
  isProcessingQueue = false
})

// Expose methods for external use
defineExpose({
  renderContent,
  reprocessMermaidDiagrams,
  isRendering,
  renderError
})
</script>

<style scoped>
.markdown-renderer {
  height: 100%;
  overflow-y: auto;
  padding: 1rem;
}

/* Custom scrollbar for the renderer */
.markdown-renderer::-webkit-scrollbar {
  width: 6px;
}

.markdown-renderer::-webkit-scrollbar-track {
  background: transparent;
}

.markdown-renderer::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-thumb-color);
  border-radius: 3px;
}

.markdown-renderer::-webkit-scrollbar-thumb:hover {
  background-color: var(--scrollbar-thumb-hover-color);
}

.markdown-renderer.is-rendering {
  opacity: 0.6;
  pointer-events: none;
}

.markdown-renderer.has-error {
  border: 1px solid var(--el-color-danger);
  background-color: var(--el-color-danger-light-9);
}

/* Mermaid diagram styles */
:deep(.mermaid-container) {
  margin: 1rem 0;
  padding: 1rem;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background-color: var(--el-bg-color-page);
  text-align: center;
  min-height: 120px; /* Fixed minimum height to prevent layout shift */
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden; /* Prevent content from breaking container */
}

:deep(.mermaid-loading) {
  color: var(--el-text-color-secondary);
  font-style: italic;
  padding: 2rem;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  white-space: nowrap;
}

:deep(.mermaid-rendered) {
  margin: 1rem 0;
  text-align: center;
  background-color: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid var(--el-border-color);
  overflow: hidden; /* Prevent SVG overflow */
  position: relative;
  display: flex; /* Add flexbox for centering */
  justify-content: center; /* Center the SVG horizontally */
  align-items: center; /* Center vertically if needed */
}

/* SVG wrapper for aspect ratio maintenance */
:deep(.mermaid-svg-wrapper) {
  width: 100%;
  height: 0;
  position: relative;
  overflow: hidden;
}

:deep(.mermaid-rendered svg) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
}

:deep(.mermaid-error) {
  padding: 1rem;
  border: 1px solid var(--el-color-danger);
  border-radius: 8px;
  background-color: var(--el-color-danger-light-9);
  text-align: left;
  min-height: 120px; /* Same as container to prevent shift */
}

:deep(.mermaid-error .error-icon) {
  font-size: 1.2em;
  margin-bottom: 0.5rem;
}

:deep(.mermaid-error .error-message) {
  font-weight: 600;
  color: var(--el-color-danger);
  margin-bottom: 0.5rem;
}

:deep(.mermaid-error .error-details) {
  margin-top: 0.5rem;
}

:deep(.mermaid-error .error-details pre) {
  background-color: var(--el-color-danger-light-8);
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.85em;
  overflow-x: auto;
}

/* Standard markdown styles */
:deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
  line-height: 1.4;
}

:deep(h1) { font-size: 2rem; border-bottom: 1px solid var(--el-border-color); padding-bottom: 0.5rem; }
:deep(h2) { font-size: 1.75rem; }
:deep(h3) { font-size: 1.5rem; }
:deep(h4) { font-size: 1.25rem; }
:deep(h5) { font-size: 1.1rem; }
:deep(h6) { font-size: 1rem; }

:deep(p) {
  margin-bottom: 1rem;
}

:deep(ul), :deep(ol) {
  margin-bottom: 1rem;
  padding-left: 2rem;
}

:deep(blockquote) {
  margin: 1rem 0;
  padding: 0.5rem 1rem;
  border-left: 4px solid var(--el-color-primary);
  background-color: var(--el-bg-color-page);
  border-radius: 0 4px 4px 0;
}

:deep(code) {
  background-color: var(--el-bg-color-page);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
}

:deep(pre) {
  margin: 1rem 0;
  padding: 1rem;
  background-color: var(--el-bg-color-page);
  border-radius: 8px;
  overflow-x: auto;
  border: 1px solid var(--el-border-color);
}

:deep(pre code) {
  background: none;
  padding: 0;
}

:deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

:deep(th), :deep(td) {
  padding: 0.75rem;
  border: 1px solid var(--el-border-color);
  text-align: left;
}

:deep(th) {
  background-color: var(--el-bg-color-page);
  font-weight: 600;
}

:deep(hr) {
  margin: 2rem 0;
  border: none;
  border-top: 1px solid var(--el-border-color);
}

:deep(a) {
  color: var(--el-color-primary);
  text-decoration: none;
}

:deep(a:hover) {
  text-decoration: underline;
}

:deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}
</style>
