<template>
  <el-dialog
    class="file-preview-dialog"
    :model-value="visible"
    :title="file.name"
    width="70%"
    append-to-body
    destroy-on-close
    @close="handleClose"
  >
    <template #header>
      <div class="dialog-header">
        <span class="dialog-title">{{ file.name }}</span>
      </div>
    </template>
    <section class="preview-body">
      <div v-if="loading" class="preview-status">
        <el-icon class="preview-status__icon" :size="20">
          <Loading />
        </el-icon>
        <span>{{ t('file.previewLoading') }}</span>
      </div>
      <div v-else-if="previewError" class="preview-status">
        <el-icon class="preview-status__icon" :size="20">
          <Warning />
        </el-icon>
        <span>{{ previewError }}</span>
      </div>
      <div v-else-if="category === 'image'" class="preview-image">
        <img :src="fileUrl" :alt="file.name" />
      </div>
      <div v-else-if="category === 'video'" class="preview-media">
        <video :src="fileUrl" controls />
      </div>
      <div v-else-if="category === 'audio'" class="preview-audio">
        <audio :src="fileUrl" controls />
      </div>
      <div v-else-if="category === 'pdf'" class="preview-pdf">
        <iframe :src="fileUrl" />
      </div>
      <div v-else-if="category === 'markdown'" class="preview-markdown">
        <MdPreview :model-value="textContent" :theme="appStore.theme" preview-theme="github" />
      </div>
      <div v-else-if="category === 'text'" class="preview-text">
        <pre>{{ textContent }}</pre>
      </div>
      <div v-else class="preview-status">
        <el-icon class="preview-status__icon" :size="20">
          <Warning />
        </el-icon>
        <span>{{ t('file.previewUnsupported') }}</span>
      </div>
    </section>
    <template #footer>
      <div class="dialog-footer">
        <span class="file-meta">
          {{ Utils.humanReadableSize(file.size) }} •
          {{ file.contentType || t('file.previewUnknownType') }}
        </span>
        <el-button @click="handleClose">
          {{ t('common.buttons.close') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Loading, Warning } from '@element-plus/icons-vue'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'
import type { FileInfo } from '@/types'
import api from '@/api'
import { useI18n } from '@/composables/useI18n'
import { useAppStore } from '@/stores'
import { Utils } from '@/utils'
import {
  getPreviewCategory,
  isTextCategory,
  type PreviewCategory,
} from 'shared/utils/mime'

const props = defineProps<{
  visible: boolean
  file: FileInfo
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const appStore = useAppStore()
const loading = ref(false)
const previewError = ref<string | null>(null)
const textContent = ref('')
const category = computed<PreviewCategory>(() =>
  getPreviewCategory(props.file.name, props.file.contentType)
)
const fileUrl = computed(
  () =>
    `${api.getUrlPrefix()}/file/download?name=${encodeURIComponent(props.file.name)}`
)

let abortController: AbortController | null = null
const loadedKey = ref('')

const resetState = () => {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
  loading.value = false
  previewError.value = null
  if (!isTextCategory(category.value)) {
    textContent.value = ''
  }
}

const fetchTextContent = async () => {
  const currentKey = `${props.file.name}:${props.file.lastModified}`
  if (loadedKey.value === currentKey && textContent.value) {
    return
  }

  if (abortController) {
    abortController.abort()
  }

  abortController = new AbortController()
  loading.value = true
  previewError.value = null

  try {
    const response = await fetch(fileUrl.value, {
      signal: abortController.signal,
      headers: {
        Accept: 'text/plain, text/markdown, application/json;q=0.9, */*;q=0.5',
      },
    })

    if (!response.ok) {
      throw new Error(`Preview request failed with status ${response.status}`)
    }

    textContent.value = await response.text()
    loadedKey.value = currentKey
  } catch (error) {
    if (abortController?.signal.aborted) {
      return
    }
    console.error('Failed to load preview content:', error)
    previewError.value = t('file.previewLoadError')
  } finally {
    if (!abortController?.signal.aborted) {
      loading.value = false
      abortController = null
    }
  }
}

watch(
  () => ({
    visible: props.visible,
    key: `${props.file.name}:${props.file.lastModified}`,
    category: category.value,
  }),
  (state) => {
    if (!state.visible) {
      resetState()
      return
    }

    if (isTextCategory(state.category)) {
      void fetchTextContent()
    } else {
      resetState()
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (abortController) {
    abortController.abort()
  }
})

const handleClose = () => {
  emit('close')
}

</script>

<style scoped>
.file-preview-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.dialog-title {
  font-weight: 600;
  font-size: 16px;
  margin-right: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-body {
  min-height: 320px;
  max-height: 70vh;
  padding: 16px;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-secondary);
}

.preview-status__icon {
  color: var(--el-color-primary);
}

.preview-image img,
.preview-media video,
.preview-audio audio,
.preview-pdf iframe {
  max-width: 100%;
  max-height: 65vh;
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preview-media,
.preview-image,
.preview-pdf {
  width: 100%;
  display: flex;
  justify-content: center;
}

.preview-audio {
  width: 100%;
  display: flex;
  justify-content: center;
}

.preview-text {
  width: 100%;
  max-height: 65vh;
  overflow: auto;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  padding: 16px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  color: var(--el-text-color-primary);
}

.preview-text pre {
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-markdown {
  width: 100%;
}

.preview-markdown :deep(.md-editor-preview-wrapper) {
  max-height: 65vh;
  overflow: auto;
}

.dialog-footer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.file-meta {
  margin-right: auto;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
