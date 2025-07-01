<template>
  <el-input
    v-model="model"
    type="textarea"
    :rows="15"
    placeholder="在此输入或粘贴内容..."
    resize="none"
    @blur="$emit('request-auto-save')"
    :disabled="viewMode"
  />
</template>

<script setup lang="ts">
// Vue 3.4+ 的推荐方式，极大简化 v-model 的实现
const model = defineModel<string | undefined>()

// 定义其他 props 和 emits
defineProps<{
  viewMode: boolean
}>()

defineEmits<{
  (e: 'request-auto-save'): void
}>()
</script>

<style scoped>
:deep(.el-textarea__inner) {
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
  line-height: 1.6;
  font-size: 14px;
}
</style>
