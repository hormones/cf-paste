<template>
  <div
    ref="previewRef"
    v-loading="isRendering"
    class="markdown-preview"
    :class="{ 'is-empty': isEmpty }"
  >
    <div
      v-if="!isEmpty && !renderError"
      class="markdown-preview__content"
      v-html="renderedContent"
    />
    <div v-else-if="renderError" class="markdown-preview__error">
      <div class="markdown-preview__error-title">
        {{ t('markdown.renderError') }}
      </div>
      <div class="markdown-preview__error-content">
        <pre>{{ content }}</pre>
      </div>
    </div>
    <div v-else class="markdown-preview__placeholder">
      {{ t('markdown.previewPlaceholder') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useAppStore } from '@/stores'
import { useI18nComposable } from '@/composables/useI18n'
import { useClipboard } from '@/composables/useClipboard'

const appStore = useAppStore()
const { t } = useI18nComposable()
const { renderMarkdown, debounce } = useClipboard()

const previewRef = ref<HTMLElement | null>(null)
const renderedContent = ref<string>('')
const isRendering = ref(false)
const renderError = ref(false)

// Direct binding to store content
const content = computed(() => appStore.keyword.content || '')

// Check if content is empty
const isEmpty = computed(() => !content.value.trim())

// Debounced render function to avoid excessive re-rendering
const debouncedRender = debounce(async () => {
  if (isEmpty.value) {
    renderedContent.value = ''
    isRendering.value = false
    renderError.value = false
    return
  }

  isRendering.value = true
  renderError.value = false

  try {
    // Add slight delay to show loading state for UX
    await new Promise(resolve => setTimeout(resolve, 50))

    const html = renderMarkdown(content.value)
    renderedContent.value = html

    // Wait for DOM update before adjusting scroll
    await nextTick()
  } catch (error) {
    console.warn('Markdown preview render failed:', error)
    renderError.value = true
    renderedContent.value = ''
  } finally {
    isRendering.value = false
  }
}, 300)

// Watch content changes and trigger debounced render
watch(content, () => {
  debouncedRender()
}, { immediate: true })

// Expose preview element ref for scroll sync
defineExpose({
  previewRef
})
</script>

<style scoped>
.markdown-preview {
  width: 100%;
  height: 100%; /* 占满父容器高度 */
  min-height: 192px;
  padding: 12px 16px;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  background-color: var(--color-surface);
  color: var(--color-text);
  overflow-y: auto; /* 内容超长时显示滚动条 */
  transition: background-color 0.3s, color 0.3s, border-color 0.3s;
}

.markdown-preview.is-empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.markdown-preview__placeholder {
  color: var(--el-text-color-placeholder);
  font-style: italic;
  text-align: center;
}

.markdown-preview__error {
  color: var(--el-color-danger);
}

.markdown-preview__error-title {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
}

.markdown-preview__error-content {
  background: var(--el-color-danger-light-9);
  border: 1px solid var(--el-color-danger-light-7);
  border-radius: 4px;
  padding: 8px;
}

.markdown-preview__error-content pre {
  margin: 0;
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>

<style>
/* Global styles for rendered markdown content */
.markdown-preview__content {
  font-family: var(--el-font-family);
  line-height: 1.7;
  color: var(--color-text);
}

.markdown-preview__content h1,
.markdown-preview__content h2,
.markdown-preview__content h3,
.markdown-preview__content h4,
.markdown-preview__content h5,
.markdown-preview__content h6 {
  margin: 1.5em 0 0.5em 0;
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-text);
}

.markdown-preview__content h1:first-child,
.markdown-preview__content h2:first-child,
.markdown-preview__content h3:first-child {
  margin-top: 0;
}

.markdown-preview__content h1 { font-size: 1.75em; }
.markdown-preview__content h2 { font-size: 1.5em; }
.markdown-preview__content h3 { font-size: 1.25em; }

.markdown-preview__content p {
  margin: 0.8em 0;
}

.markdown-preview__content p:first-child {
  margin-top: 0;
}

.markdown-preview__content a {
  color: var(--el-color-primary);
  text-decoration: none;
}

.markdown-preview__content a:hover {
  text-decoration: underline;
}

.markdown-preview__content pre {
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  margin: 1em 0;
  overflow-x: auto;
}

.markdown-preview__content pre code {
  display: block;
  padding: 12px 16px;
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  background: none;
  border: none;
  border-radius: 0;
}

.markdown-preview__content code {
  background: var(--el-fill-color-light);
  color: var(--el-color-danger);
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
}

.markdown-preview__content .hljs {
  background: var(--el-fill-color-lighter) !important;
  color: var(--color-text) !important;
}
</style>
