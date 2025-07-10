<template>
  <div class="markdown-editor">
    <textarea
      ref="textareaRef"
      v-model="content"
      class="markdown-editor__textarea"
      :placeholder="t('clipboard.placeholder')"
      :disabled="appStore.viewMode"
      @blur="handleBlur"
      @input="adjustHeight"
    />
    <div v-if="showStats" class="markdown-editor__stats">
      {{ t('markdown.stats', {
        characters: stats.characters,
        words: stats.words
      }) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useAppStore } from '@/stores'
import { useI18nComposable } from '@/composables/useI18n'
import { useClipboard } from '@/composables/useClipboard'

interface Props {
  showStats?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showStats: true
})

const emit = defineEmits(['auto-save'])

const appStore = useAppStore()
const { t } = useI18nComposable()
const { calculateStats } = useClipboard()

const textareaRef = ref<HTMLTextAreaElement | null>(null)

// Direct binding to store content
const content = computed({
  get: () => appStore.keyword.content || '',
  set: (value: string) => {
    appStore.updateKeywordFields({ content: value })
  }
})

// Calculate content statistics
const stats = computed(() => calculateStats(content.value))

// Auto-resize textarea height - 现在不需要自动调整高度，因为使用flex布局
const adjustHeight = () => {
  // 保留函数但不执行任何操作，以保持组件接口兼容性
}

// Handle blur event for auto-save
const handleBlur = () => {
  if (appStore.viewMode) {
    return
  }
  if (appStore.lastSavedContent === content.value) {
    return
  }
  emit('auto-save')
}

// Initialize textarea height on mount
onMounted(() => {
  adjustHeight()
})

// Watch content changes to adjust height
watch(content, () => {
  adjustHeight()
}, { immediate: true })

// Expose textarea element ref for scroll sync
defineExpose({
  textareaRef
})
</script>

<style scoped>
.markdown-editor {
  position: relative;
  width: 100%;
  height: 100%; /* 占满父容器高度 */
  display: flex;
  flex-direction: column;
}

.markdown-editor__textarea {
  width: 100%;
  flex: 1; /* 占满剩余空间 */
  min-height: 192px; /* 12 lines * 16px */
  padding: 12px 16px;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  background-color: var(--color-surface);
  color: var(--color-text);
  resize: none; /* 禁用手动调整大小，因为使用flex自动调整 */
  overflow-y: auto; /* 内容超长时显示滚动条 */

  /* Typography system - monospace for code editing */
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;

  /* Remove default styling */
  border: none;
  outline: none;
  box-shadow: none;

  /* Smooth transitions */
  transition: background-color 0.3s, color 0.3s, border-color 0.3s;
}

.markdown-editor__textarea:focus {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px var(--el-color-primary-light-9);
}

.markdown-editor__textarea:disabled {
  background-color: var(--el-disabled-bg-color);
  color: var(--el-disabled-text-color);
  cursor: not-allowed;
}

.markdown-editor__textarea::placeholder {
  color: var(--el-text-color-placeholder);
}

.markdown-editor__stats {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background: var(--color-surface);
  padding: 2px 6px;
  border-radius: 4px;
  pointer-events: none;
  user-select: none;
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .markdown-editor__textarea {
    border-color: var(--el-border-color-darker);
  }

  .markdown-editor__stats {
    background: rgba(0, 0, 0, 0.6);
  }
}
</style>
