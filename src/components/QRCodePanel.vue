<template>
  <el-card v-if="keyword.id" class="qrcode-card" shadow="never">
    <template #header>
      <el-text tag="b" class="card-title">只读链接</el-text>
    </template>

    <div class="qrcode-container">
      <div class="qrcode-wrapper" @click="copyReadOnlyLink">
        <QRCode :data="readOnlyLink" :size="150" />
      </div>

      <el-input
        :model-value="readOnlyLink"
        readonly
        class="link-input"
        @click="copyReadOnlyLink"
      >
        <template #append>
          <el-button @click="copyReadOnlyLink">复制</el-button>
        </template>
      </el-input>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import QRCode from './QRCode.vue'
import { useMain } from '@/composables/useMain'
import { useAppStore } from '@/stores'
import { computed } from 'vue'

const { copyReadOnlyLink } = useMain()
const appStore = useAppStore()

const readOnlyLink = computed(() => appStore.readOnlyLink)
const keyword = computed(() => appStore.keyword)
</script>

<style scoped>
.qrcode-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.card-title {
  font-size: 14px;
}

.qrcode-container {
  text-align: center;
}

.qrcode-wrapper {
  display: inline-block;
  cursor: pointer;
  transition: transform 0.2s;
}

.qrcode-wrapper:hover {
  transform: scale(1.02);
}

.link-input {
  margin-top: 15px;
}

.link-input :deep(.el-input__wrapper) {
  border-radius: 6px;
  box-shadow: 0 0 0 1px var(--el-border-color-lighter);
  background-color: var(--el-fill-color-lighter);
}

.link-input :deep(.el-input__inner) {
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  cursor: pointer;
  background-color: transparent;
  color: var(--el-text-color-regular);
}

.link-input :deep(.el-input-group__append) {
  border-radius: 0 6px 6px 0;
  border-left: 1px solid var(--el-border-color-lighter);
}
</style>
