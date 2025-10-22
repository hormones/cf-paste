<template>
  <el-dialog
    :model-value="true"
    :width="dialogWidth"
    class="text-preview-dialog"
    append-to-body
    destroy-on-close
    @close="handleClose"
  >
    <template #header>
      <div class="preview-header">
        <span class="preview-title">{{ file.name }}</span>
        <div class="preview-actions">
          <el-button-group size="small">
            <el-button :icon="CopyDocument" @click="handleCopy">
              {{ t('common.buttons.copy') }}
            </el-button>
            <el-button :icon="Download" @click="handleDownload">
              {{ t('common.buttons.download') }}
            </el-button>
          </el-button-group>
        </div>
      </div>
    </template>

    <div class="text-container" :style="containerStyle">
      <div v-if="loading" class="text-loading">
        <el-icon class="rotating" :size="32">
          <Loading />
        </el-icon>
        <span>{{ t('file.previewLoading') }}</span>
      </div>

      <div v-else-if="error" class="text-error">
        <el-icon :size="32">
          <Warning />
        </el-icon>
        <span>{{ error }}</span>
      </div>

      <template v-else>
        <!-- Markdown Preview -->
        <div v-if="category === 'markdown'" ref="contentRef" class="markdown-wrapper">
          <MdPreview
            :model-value="textContent"
            :theme="appStore.theme"
            preview-theme="github"
            :show-code-row-number="true"
          />
        </div>

        <!-- Plain Text / Code Preview -->
        <pre v-else ref="contentRef" class="text-content"><code>{{ textContent }}</code></pre>
      </template>
    </div>

    <template #footer>
      <div class="preview-footer">
        <span class="file-meta">
          {{ lines }} {{ t('file.lines') }} •
          {{ Utils.humanReadableSize(file.size) }} •
          {{ file.contentType || 'text/plain' }}
        </span>
        <el-button @click="handleClose">
          {{ t('common.buttons.close') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { Loading, Warning, CopyDocument, Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'
import type { FileInfo } from '@/types'
import { useI18n } from '@/composables/useI18n'
import { useAppStore } from '@/stores'
import { Utils } from '@/utils'

const props = defineProps<{
  file: FileInfo
  fileUrl: string
  category: 'text' | 'markdown'
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const appStore = useAppStore()
const loading = ref(true)
const error = ref<string | null>(null)
const textContent = ref('')
const contentRef = ref<HTMLElement>()
const contentHeight = ref(0)

let abortController: AbortController | null = null

// Fixed width, dynamic height based on content
const dialogWidth = computed(() => {
  const viewportWidth = window.innerWidth
  return `${Math.min(800, viewportWidth * 0.85)}px`
})

const lines = computed(() => {
  if (!textContent.value) return 0
  return textContent.value.split('\n').length
})

// Measure content height after render
watch([textContent, contentRef], async ([content, el]) => {
  if (content && el) {
    await nextTick()
    contentHeight.value = el.scrollHeight
  }
}, { immediate: true })

const containerStyle = computed(() => {
  const viewportHeight = window.innerHeight
  const minHeight = 300
  const maxHeight = viewportHeight * 0.75

  // Use measured height, clamped to min/max
  let height = contentHeight.value
  if (height === 0) height = minHeight

  height = Math.max(minHeight, Math.min(height, maxHeight))

  return {
    minHeight: `${minHeight}px`,
    maxHeight: `${height}px`,
    overflow: 'auto',
  }
})

// Fetch text content
const fetchContent = async () => {
  if (abortController) {
    abortController.abort()
  }

  abortController = new AbortController()
  loading.value = true
  error.value = null

  try {
    const response = await fetch(props.fileUrl, {
      signal: abortController.signal,
      headers: {
        Accept: 'text/plain, text/markdown, application/json;q=0.9, */*;q=0.5',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    textContent.value = await response.text()
  } catch (err) {
    if (abortController?.signal.aborted) {
      return
    }
    console.error('Failed to load text content:', err)
    error.value = t('file.previewLoadError')
  } finally {
    if (!abortController?.signal.aborted) {
      loading.value = false
      abortController = null
    }
  }
}

// Load content on mount
fetchContent()

onBeforeUnmount(() => {
  if (abortController) {
    abortController.abort()
  }
})

const handleClose = () => {
  emit('close')
}

const handleCopy = async () => {
  if (!textContent.value) return

  try {
    await navigator.clipboard.writeText(textContent.value)
    ElMessage.success(t('common.messages.copySuccess'))
  } catch (err) {
    console.error('Failed to copy:', err)
    ElMessage.error(t('common.messages.copyFailed'))
  }
}

const handleDownload = () => {
  const link = document.createElement('a')
  link.href = props.fileUrl
  link.download = props.file.name
  link.click()
}
</script>

<style scoped>
.text-preview-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 16px;
}

.preview-title {
  font-weight: 600;
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.preview-actions {
  flex-shrink: 0;
}

.text-container {
  width: 100%;
  position: relative;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  margin: 16px;
  padding: 16px;
}

.text-loading,
.text-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 200px;
  color: var(--el-text-color-secondary);
}

.text-error {
  color: var(--el-color-danger);
}

.rotating {
  animation: rotate 1.5s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.markdown-wrapper {
  width: 100%;
  overflow: auto;
}

.markdown-wrapper :deep(.md-editor-preview-wrapper) {
  padding: 0;
}

.text-content {
  width: 100%;
  margin: 0;
  padding: 16px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  white-space: pre-wrap;
  word-break: break-word;
  overflow: auto;
}

.text-content code {
  font-family: inherit;
  background: transparent;
  padding: 0;
}

.preview-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.file-meta {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
