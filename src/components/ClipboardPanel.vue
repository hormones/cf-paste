<template>
  <el-input
    v-model="modelValue"
    type="textarea"
    :autosize="{ minRows: 12, maxRows: 20 }"
    placeholder="在此处粘贴任何内容"
    :disabled="appStore.viewMode"
    @blur="handleBlur"
  />
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores'

const modelValue = defineModel<string>()

const appStore = useAppStore()

const emit = defineEmits(['auto-save'])

const handleBlur = () => {
  emit('auto-save')
}
</script>

<style scoped>
:deep(.el-textarea__inner) {
  /* 与我们的设计系统保持一致 */
  background-color: var(--color-surface);
  color: var(--color-text);
  border-color: transparent; /* 移除内部边框，因为父容器已有边框 */

  /* 字体样式 */
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
  line-height: 1.6;
  font-size: 14px;

  /* 确保禁用状态下样式正确 */
  box-shadow: none;
}
:deep(.el-textarea__inner:hover),
:deep(.el-textarea__inner:focus) {
  border-color: transparent;
  box-shadow: none;
}
</style>
