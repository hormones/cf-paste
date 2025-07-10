<template>
  <el-input
    v-model="modelValue"
    type="textarea"
    :autosize="{ minRows: 12, maxRows: 20 }"
    :placeholder="t('clipboard.placeholder')"
    :disabled="appStore.viewMode"
    @blur="handleBlur"
  />
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores'
import { useI18nComposable } from '@/composables/useI18n'

const modelValue = defineModel<string>()

const appStore = useAppStore()
const { t } = useI18nComposable()

const emit = defineEmits(['auto-save'])

const handleBlur = () => {
  if (appStore.viewMode) {
    return
  }
  if (appStore.lastSavedContent === modelValue.value) {
    return
  }
  emit('auto-save')
}
</script>

<style scoped>
:deep(.el-textarea__inner) {
  background-color: var(--color-surface);
  color: var(--color-text);
  border-color: transparent; /* Remove inner border as parent container already has border */

  /* Typography system */
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
  line-height: 1.6;
  font-size: 14px;

  /* Ensure proper disabled state styling */
  box-shadow: none;

  transition: background-color 0.5s, color 0.5s, border-color 0.5s;
}
:deep(.el-textarea__inner:hover),
:deep(.el-textarea__inner:focus) {
  border-color: transparent;
  box-shadow: none;
}
</style>
