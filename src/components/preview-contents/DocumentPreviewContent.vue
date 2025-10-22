<template>
  <div class="document-content-wrapper">
    <!-- Type-specific action buttons (rendered in parent's header via Teleport) -->
    <Teleport to="[data-preview-actions]" :disabled="!mounted">
      <el-button :icon="FullScreen" @click="toggleFullscreen">
        {{ fullscreen ? t('common.buttons.exitFullscreen') : t('common.buttons.fullscreen') }}
      </el-button>
    </Teleport>

    <!-- PDF iframe -->
    <iframe
      ref="iframeRef"
      class="document-frame"
      :src="fileUrl"
      frameborder="0"
      @load="handleLoad"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted, onBeforeUnmount } from 'vue'
import type { PreviewResizePayload } from '@/types/preview'
import { FullScreen } from '@element-plus/icons-vue'
import type { FileInfo } from '@/types'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{
  file: FileInfo
  fileUrl: string
  fullscreen: boolean
}>()

const emit = defineEmits<{
  loaded: []
  error: [string]
  resize: [PreviewResizePayload | null]
}>()

const { t } = useI18n()

// Inject toggle function from parent
const toggleFullscreen = inject<() => void>('toggleFullscreen', () => {})

// Component state
const iframeRef = ref<HTMLIFrameElement>()
const mounted = ref(false)

const applyDefaultSize = () => {
  const payload: PreviewResizePayload = {
    width: 'min(1200px, 90vw)',
    maxHeight: '90vh',
    minHeight: '300px',
  }
  emit('resize', payload)
}

onMounted(() => {
  mounted.value = true
  applyDefaultSize()
})

onBeforeUnmount(() => {
  emit('resize', null)
})

// Event handlers
const handleLoad = () => {
  emit('loaded')
}
</script>

<style scoped>
.document-content-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.document-frame {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}
</style>
