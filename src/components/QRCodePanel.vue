<template>
  <el-card v-if="keyword.id" class="qrcode-card" shadow="never">
    <template #header>
      <el-text tag="b">只读链接</el-text>
    </template>

    <div class="qrcode-container">
      <div class="qrcode-wrapper" @click="copyReadOnlyLink">
        <QRCode :data="readOnlyLink" :size="150" />
        <div class="qrcode-overlay">
          <el-text size="small">点击复制只读链接</el-text>
        </div>
      </div>

      <el-divider />

      <el-descriptions :column="1" size="small">
        <el-descriptions-item label="口令">
          {{ keyword.view_word }}
        </el-descriptions-item>
      </el-descriptions>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import QRCode from './QRCode.vue'
import { useClipboard } from '@/composables/useClipboard'

interface KeywordInfo {
  id?: number | null
  view_word?: string
}

interface Props {
  keyword: KeywordInfo
}

defineProps<Props>()

// 直接使用 Composable，获取需要的功能
const { readOnlyLink, copyReadOnlyLink } = useClipboard()
</script>

<style scoped>
.qrcode-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.qrcode-container {
  text-align: center;
}

.qrcode-wrapper {
  position: relative;
  display: inline-block;
  cursor: pointer;
  transition: transform 0.2s;
}

.qrcode-wrapper:hover {
  transform: scale(1.02);
}

.qrcode-overlay {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
  white-space: nowrap;
}

.qrcode-wrapper:hover .qrcode-overlay {
  opacity: 1;
}

:deep(.el-descriptions__label) {
  font-weight: 500;
  color: var(--el-text-color-regular);
}

:deep(.el-descriptions__content) {
  color: var(--el-text-color-primary);
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
}
</style>
