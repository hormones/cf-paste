<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { ElMessage } from 'element-plus'
import QRCode from '@/components/QRCode.vue'
import { useAppStore } from '@/stores'
import { useMain } from '@/composables/useMain'
import { DocumentCopy, Refresh } from '@element-plus/icons-vue'

const appStore = useAppStore()
const { copy } = useClipboard()
const { resetViewWord } = useMain()

const handleCopy = (text: string) => {
  copy(text)
  ElMessage.success('已复制到剪贴板')
}
</script>

<template>
  <div class="qrcode-panel card-style" v-if="appStore.keyword.id">
    <div class="panel-header">
      <span>只读链接</span>
      <el-icon class="refresh-btn" title="刷新链接" @click="resetViewWord">
        <Refresh />
      </el-icon>
    </div>

    <div
      class="qrcode-wrapper"
      title="点击复制链接"
      @click="handleCopy(appStore.readOnlyLink)"
    >
      <QRCode :data="appStore.readOnlyLink" :size="150" />
    </div>

    <p
      class="link-text"
      :title="appStore.readOnlyLink"
      @click="handleCopy(appStore.readOnlyLink)"
    >
      {{ appStore.readOnlyLink }}
    </p>
  </div>
</template>

<style scoped>
.card-style {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.25rem;
  transition: border-color 0.5s, background-color 0.5s;
}

.qrcode-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.panel-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-heading);
}

.refresh-btn {
  cursor: pointer;
  color: var(--el-text-color-secondary);
  transition: color 0.2s, transform 0.3s ease-out;
}
.refresh-btn:hover {
  color: var(--el-color-primary);
  transform: rotate(180deg);
}

.qrcode-wrapper {
  cursor: pointer;
  padding: 10px;
  background-color: white; /* 始终为白色以获得最佳扫描效果 */
  border-radius: 8px;
  transition: transform 0.2s ease-out;
}

.qrcode-wrapper:hover {
  transform: scale(1.05);
}

.link-text {
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 0.875rem;
  color: var(--el-text-color-secondary);
  background-color: var(--color-background); /* 使用主背景以形成对比 */
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  width: 100%;
  text-align: center;
  cursor: pointer;

  /* 超长链接截断 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
