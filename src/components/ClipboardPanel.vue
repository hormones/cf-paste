<template>
  <el-input
    v-model="modelValue"
    type="textarea"
    :rows="12"
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
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
  line-height: 1.6;
  font-size: 14px;
}
</style>
