<template>
  <div class="document-content-wrapper">
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
import { ref } from 'vue'
import type { FileInfo } from '@/types'

defineProps<{
  file: FileInfo
  fileUrl: string
}>()

const emit = defineEmits<{
  loaded: [payload?: { size: { width: number; height: number } }]
  error: [string]
}>()

// Component state
const iframeRef = ref<HTMLIFrameElement>()

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
  background: var(--color-background);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}
</style>
