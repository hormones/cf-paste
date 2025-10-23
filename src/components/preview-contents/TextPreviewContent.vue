<template>
  <div class="text-content-wrapper">
    <!-- Type-specific action buttons (rendered in parent's header via Teleport) -->
    <Teleport v-if="!isMobile" :to="actionsSlot" :disabled="!mounted || !actionsSlot">
      <el-button :icon="CopyDocument" @click="handleCopy">
        {{ t('common.buttons.copy') }}
      </el-button>
    </Teleport>

    <!-- Markdown preview -->
    <div v-if="isMarkdown" ref="contentRef" class="markdown-container">
      <MdPreview
        :model-value="textContent"
        :theme="appStore.theme"
        preview-theme="github"
        :show-code-row-number="true"
      />
    </div>

    <!-- Plain text / code preview -->
    <pre v-else ref="contentRef" class="text-container"><code>{{ textContent }}</code></pre>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'
import { CopyDocument } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'
import type { FileInfo } from '@/types'
import { useI18n } from '@/composables/useI18n'
import { useAppStore } from '@/stores'

const props = defineProps<{
  file: FileInfo
  fileUrl: string
  category: 'text' | 'markdown'
}>()

const emit = defineEmits<{
  loaded: [payload?: { size: { width: number; height: number } }]
  error: [string]
  meta: [string]
}>()

const { t } = useI18n()
const appStore = useAppStore()

const actionsSlot = inject<Ref<HTMLElement | null>>('actionsSlot', ref(null))
const isMobile = inject<Ref<boolean>>('isMobilePreview', ref(false))

// Component state
const textContent = ref('')
const contentRef = ref<HTMLElement>()
const mounted = ref(false)
const isMarkdown = computed(() => props.category === 'markdown')

let abortController: AbortController | null = null

onMounted(() => {
  mounted.value = true
  fetchContent()
})

onBeforeUnmount(() => {
  if (abortController) {
    abortController.abort()
  }
})

// Fetch text content
const fetchContent = async () => {
  if (abortController) {
    abortController.abort()
  }

  abortController = new AbortController()

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

    // Calculate line count for metadata
    const lines = textContent.value.split('\n').length
    emit('meta', `${lines} ${t('file.lines')}`)

    emit('loaded')
  } catch (err) {
    if (abortController?.signal.aborted) {
      return
    }
    console.error('Failed to load text content:', err)
    emit('error', t('file.previewLoadError'))
  } finally {
    if (!abortController?.signal.aborted) {
      abortController = null
    }
  }
}

// Copy content to clipboard
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
</script>

<style scoped>
.text-content-wrapper {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.markdown-container {
  width: 100%;
  background: var(--el-bg-color);
  border-radius: 8px;
  padding: 16px;
}

.markdown-container :deep(.md-editor-preview-wrapper) {
  padding: 0;
}

.text-container {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 16px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  white-space: pre-wrap;
  word-break: break-word;
  overflow: auto;
}

.text-container code {
  font-family: inherit;
  background: transparent;
  padding: 0;
}
</style>
