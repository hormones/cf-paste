<template>
  <div class="qrcode-panel card-style" v-if="appStore.keyword.id && appStore.readOnlyLink">
    <div class="panel-header">
      <span>{{ t('clipboard.qrcode.title') }}</span>
      <el-icon class="refresh-btn" :title="t('common.tooltips.refresh')" @click="resetViewWord">
        <Refresh />
      </el-icon>
    </div>

    <div
      class="qrcode-wrapper"
      :title="t('common.tooltips.clickToCopy')"
      @click="handleCopy(appStore.readOnlyLink)"
    >
      <img v-if="qrCodeUrl" :src="qrCodeUrl" :alt="t('clipboard.qrcode.title')" />
    </div>

    <p
      class="link-text"
      :title="t('common.tooltips.clickToCopy')"
      @click="handleCopy(appStore.readOnlyLink)"
    >
      {{ appStore.readOnlyLink }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { ElMessage } from 'element-plus'
import { useAppStore } from '@/stores'
import { useMain } from '@/composables/useMain'
import { useI18n } from '@/composables/useI18n'
import { Refresh } from '@element-plus/icons-vue'
import { ref, watch } from 'vue'
import QRCodeGenerator from 'qrcode'

const appStore = useAppStore()
const { copy } = useClipboard()
const { resetViewWord } = useMain()
const { t } = useI18n()

const qrCodeUrl = ref('')

const generateQRCode = async () => {
  if (appStore.readOnlyLink) {
    try {
      qrCodeUrl.value = await QRCodeGenerator.toDataURL(appStore.readOnlyLink, {
        width: 150,
        margin: 1,
      })
    } catch (err) {
      console.error(err)
      ElMessage.error(t('clipboard.qrcode.generateFailed'))
    }
  } else {
    qrCodeUrl.value = ''
  }
}

watch(() => appStore.readOnlyLink, generateQRCode, { immediate: true })

const handleCopy = (text: string) => {
  copy(text)
  ElMessage.success(t('clipboard.linkCopied'))
}
</script>

<style scoped>
.card-style {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.25rem;
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
  color: var(--color-text-secondary);
  transition: color 0.2s, transform 0.3s ease-out;
}
.refresh-btn:hover {
  color: var(--el-color-primary);
  transform: rotate(180deg);
}

.qrcode-wrapper {
  cursor: pointer;
  padding: 10px;
  border-radius: 8px;
  transition: transform 0.2s ease-out;
}

.qrcode-wrapper:hover {
  transform: scale(1.05);
}

.qrcode-wrapper img {
  display: block;
}

.link-text {
  font-family: var(--font-family-mono);
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  width: 100%;
  text-align: center;
  cursor: pointer;
  box-sizing: border-box;

  /* Truncate long links */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
