<template>
  <div class="markdown-editor-wrapper">
    <MdEditor
      ref="editorRef"
      v-if="!appStore.viewMode"
      v-model="localContent"
      :theme="appStore.theme"
      :language="language"
      :toolbars="toolbars"
      :preview-theme="'github'"
      :footers="[]"
      @blur="handleBlur"
      @onSave="handleSave"
      noUploadImg
    />
    <MdPreview
      v-else
      class="markdown-preview"
      :model-value="localContent"
      :theme="appStore.theme"
      :preview-theme="'github'"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { MdEditor, MdPreview, type ExposeParam } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import 'md-editor-v3/lib/preview.css'
import { useAppStore } from '@/stores'
import { useI18nComposable } from '@/composables/useI18n'
import { MARKDOWN_MODE } from '@/constant'

const localContent = defineModel<string>({ required: true })
const emit = defineEmits<{
  blur: []
  save: []
}>()

const appStore = useAppStore()
const { locale } = useI18nComposable()

const language = computed(() => (locale.value === 'zh-CN' ? 'zh-CN' : 'en-US'))

const editorRef = ref<ExposeParam>()

const toolbars = ref<[] | undefined>([])

onMounted(() => {
  editorRef.value?.on('pageFullscreen', (status) => {
    toolbars.value = status && !appStore.viewMode ? undefined : []
    if (!status) {
      appStore.setMarkdownMode(appStore.viewMode ? MARKDOWN_MODE.PREVIEW : MARKDOWN_MODE.EDIT)
    }
  })
})

watch(
  () => appStore.markdownMode,
  (newMode: string) => {
    console.log('markdownMode', newMode)
    if (newMode === MARKDOWN_MODE.EDIT) {
      editorRef.value?.togglePreview(false)
    } else if (newMode === MARKDOWN_MODE.PREVIEW) {
      editorRef.value?.togglePreviewOnly(true)
    } else if (newMode === MARKDOWN_MODE.FULLSCREEN) {
      editorRef.value?.togglePreview(true)
      editorRef.value?.togglePageFullscreen(true)
    }
  }
)

const handleBlur = () => {
  emit('blur')
}

const handleSave = () => {
  emit('save')
}
</script>

<style scoped>
.markdown-editor-wrapper {
  width: 100%;
  height: 100%;
}

:deep(.md-editor) {
  height: 100%;
  border: none;
  border-radius: 0;
}

.markdown-preview {
  overflow: auto;
}

.markdown-preview.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
}

:deep(.md-editor-fullscreen) {
  z-index: 1000;
}
</style>
