<template>
  <div class="markdown-editor" :class="[{ 'is-fullscreen': isFullscreen }, modeClasses]">
    <!-- Fullscreen Header -->
    <div v-if="isFullscreen" class="fullscreen-header">
      <div class="header-keyword">{{ keyword }}</div>
      <div class="header-actions">
        <el-button
          :icon="Close"
          text
          :title="t('markdown.buttons.exitFullscreen')"
          @click="emit('exit-fullscreen')"
        />
      </div>
    </div>

    <!-- Unified Layout Container -->
    <div class="main-content-area" :class="{ 'with-fullscreen-header': isFullscreen }">
      <!-- Editor Panel (always rendered) -->
      <div class="editor-panel">
        <textarea
          ref="textareaRef"
          v-model="localContent"
          class="editor-textarea"
          placeholder="Start typing your markdown..."
          @input="handleInput"
          @blur="handleBlur"
          @scroll="handleEditorScroll"
        />
      </div>

      <!-- Preview Panel (always rendered) -->
      <div class="preview-panel">
        <MarkdownRenderer
          ref="rendererRef"
          :content="localContent"
          @rendered="handleRendered"
          @error="handleRenderError"
        />
      </div>
    </div>

    <!-- Stats overlay (always rendered, shown/hidden with CSS) -->
    <div class="editor-stats">
      {{ contentStats.characters }} characters, {{ contentStats.words }} words
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { Close } from '@element-plus/icons-vue'
import MarkdownRenderer from './MarkdownRenderer.vue'
import { useClipboard } from '@/composables/useClipboard'
import { useI18nComposable } from '@/composables/useI18n'

const localContent = defineModel<string>({ required: true })
const { t } = useI18nComposable()

// Define props
interface Props {
  mode?: 'edit' | 'preview' | 'split'
  isFullscreen?: boolean
  keyword?: string
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'edit',
  isFullscreen: false,
  keyword: '',
})

// Define emits
const emit = defineEmits<{
  blur: []
  focus: []
  rendered: [html: string]
  error: [error: Error]
  'exit-fullscreen': []
  save: []
}>()

// Composables
const { calculateStats, setupScrollSync } = useClipboard()

// Template refs
const textareaRef = ref<HTMLTextAreaElement>()
const rendererRef = ref<InstanceType<typeof MarkdownRenderer>>()

// Local state
let scrollSyncCleanup: (() => void) | null = null
let isEditorScrolling = false
let isPreviewScrolling = false
let scrollTimeout: number | null = null

// Computed properties
const modeClasses = computed(() => ({
  'mode-edit': props.mode === 'edit',
  'mode-preview': props.mode === 'preview',
  'mode-split': props.mode === 'split',
}))

const contentStats = computed(() => calculateStats(localContent.value))

// Watch mode changes to setup/cleanup scroll sync
watch(
  () => props.mode,
  (newMode, oldMode) => {
    if (newMode === 'split') {
      // Elements are always in the DOM, so no need for nextTick
      setupScrollSynchronization()
    } else if (oldMode === 'split') {
      // Clean up when leaving split mode
      cleanupScrollSync()
    }
  },
  { immediate: true }
)

// Event handlers
function handleInput(): void {
  // Content is already updated via v-model
}

function handleBlur(): void {
  emit('blur')
}

function handleRendered(html: string): void {
  emit('rendered', html)
}

function handleRenderError(error: Error): void {
  emit('error', error)
}

function handleEditorScroll(): void {
  if (props.mode !== 'split' || isPreviewScrolling) return

  // Debounce scroll events to prevent jitter
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }

  scrollTimeout = window.setTimeout(() => {
    isEditorScrolling = true

    const editor = textareaRef.value
    const preview = getPreviewElement()

    if (editor && preview) {
      syncScroll(editor, preview)
    }

    setTimeout(() => {
      isEditorScrolling = false
    }, 100)
  }, 16) // ~60fps
}

// Helper functions
function getPreviewElement(): HTMLElement | null {
  return rendererRef.value?.$el || null
}

function syncScroll(source: HTMLElement, target: HTMLElement): void {
  // Prevent infinite scroll loops
  if (Math.abs(source.scrollTop - target.scrollTop) < 5) return

  const sourceScrollTop = source.scrollTop
  const sourceScrollHeight = Math.max(source.scrollHeight - source.clientHeight, 1)
  const scrollPercentage = sourceScrollTop / sourceScrollHeight

  const targetScrollHeight = Math.max(target.scrollHeight - target.clientHeight, 1)
  const targetScrollTop = targetScrollHeight * scrollPercentage

  // Use requestAnimationFrame for smoother scrolling
  requestAnimationFrame(() => {
    target.scrollTop = targetScrollTop
  })
}

function setupScrollSynchronization(): void {
  if (props.mode !== 'split') return

  cleanupScrollSync()

  // Delay setup to ensure DOM is ready
  setTimeout(() => {
    const editor = textareaRef.value
    const preview = getPreviewElement()

    if (editor && preview) {
      // Use passive listeners for better performance
      const editorScrollHandler = () => handleEditorScroll()
      editor.addEventListener('scroll', editorScrollHandler, { passive: true })

      scrollSyncCleanup = () => {
        editor.removeEventListener('scroll', editorScrollHandler)
      }
    }
  }, 100)
}

function cleanupScrollSync(): void {
  if (scrollSyncCleanup) {
    scrollSyncCleanup()
    scrollSyncCleanup = null
  }
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
    scrollTimeout = null
  }
}

// Fullscreen save functionality
const handleKeyDown = (event: KeyboardEvent) => {
  if (props.isFullscreen && (event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    emit('save')
  }
}

watch(
  () => props.isFullscreen,
  (isFS) => {
    if (isFS) {
      window.addEventListener('keydown', handleKeyDown)
    } else {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }
)

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

// Public methods
async function focus(): Promise<void> {
  if (textareaRef.value) {
    await nextTick()
    textareaRef.value.focus()
  }
}

async function refresh(): Promise<void> {
  if (rendererRef.value?.renderContent) {
    await rendererRef.value.renderContent()
  }
}

async function reprocessDiagrams(): Promise<void> {
  if (rendererRef.value?.reprocessMermaidDiagrams) {
    await rendererRef.value.reprocessMermaidDiagrams()
  }
}

// Lifecycle
onMounted(() => {
  if (props.mode === 'split') {
    setupScrollSynchronization()
  }
})

onUnmounted(() => {
  cleanupScrollSync()
})

// Expose public API
defineExpose({
  focus,
  refresh,
  reprocessDiagrams,
  contentStats,
  textareaRef,
})
</script>

<style scoped>
/* Main container */
.markdown-editor {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  position: relative;
  background-color: var(--color-surface);
}

/* Fullscreen mode adjustments */
.markdown-editor.is-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  border-radius: 0;
  z-index: 1000;
  border: none;
}

/* Fullscreen Header */
.fullscreen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  height: 50px;
}

.header-keyword {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-heading);
}

.header-actions .el-button {
  color: var(--el-text-color-regular);
  font-size: 20px;
}

.header-actions .el-button:hover {
  color: var(--el-color-primary);
}

/* --- NEW LAYOUT STYLES --- */

/* Unified Layout Container */
.main-content-area {
  flex: 1; /* Occupy remaining vertical space */
  display: flex;
  flex-direction: row;
  position: relative;
  min-height: 0; /* Prevent flex item from overflowing its container */
}

.main-content-area.with-fullscreen-header {
  height: calc(100% - 50px);
}

/* Base Panel Styles */
.editor-panel,
.preview-panel {
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Prevent the panel itself from scrolling */
}

/* Mode-based layouts */
.mode-edit .editor-panel {
  flex: 1 0 100%;
}
.mode-edit .preview-panel {
  display: none;
}

.mode-preview .preview-panel {
  flex: 1 0 100%;
}
.mode-preview .editor-panel {
  display: none;
}

.mode-split .editor-panel {
  flex: 1 1 50%;
  border-right: 1px solid var(--color-border);
}
.mode-split .preview-panel {
  flex: 1 1 50%;
}

.markdown-editor.is-fullscreen .split-panel.editor-panel,
.markdown-editor.is-fullscreen .preview-panel {
  background-color: var(--color-surface);
}

/* Textarea styling */
.editor-textarea {
  /* Use flexbox to handle sizing instead of a fixed height */
  flex: 1;
  padding: 1rem;
  border: none;
  background-color: transparent;
  color: var(--color-text);
  font-family: var(--font-family-mono);
  font-size: 1rem;
  line-height: 1.6;
  resize: none;
  outline: none;
  white-space: pre-wrap; /* Ensure text wraps */
  word-break: break-all; /* Break long words/strings */

  /* Optimize scrolling performance */
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin !important;
  scrollbar-color: var(--el-border-color-dark) transparent;
}

/* Webkit scrollbar styling for markdown content */
.editor-textarea::-webkit-scrollbar {
  width: 8px;
}

.editor-textarea::-webkit-scrollbar-track {
  background: transparent;
}

.editor-textarea::-webkit-scrollbar-thumb {
  background: var(--el-border-color-dark);
  border-radius: 4px;
}

.editor-textarea::-webkit-scrollbar-thumb:hover {
  background: var(--el-border-color-darker);
}

/* THE SCROLLERS - Preview renderer */
.preview-panel :deep(.markdown-renderer) {
  height: 100%;
  /* The renderer itself will handle its y-overflow */
}

/* Stats display */
.editor-stats {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background-color: var(--color-background-mute);
  padding: 2px 6px;
  border-radius: 4px;
  opacity: 0.7;
  pointer-events: none;
}

.mode-preview .editor-stats {
  display: none;
}

/* --- END OF NEW LAYOUT STYLES --- */

/* The rest of the old styles are replaced by the new layout styles above */
</style>
