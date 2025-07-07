<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores'
import { ElButton, ElMessageBox } from 'element-plus'
import { Setting, Moon, Sunny, InfoFilled, Delete } from '@element-plus/icons-vue'
import { useMain } from '@/composables/useMain'

const appStore = useAppStore()
const { deleteKeyword } = useMain()
const { theme: currentTheme } = storeToRefs(appStore)
const { toggleTheme } = appStore // 直接解构新的 action
/**
 * 打开设置对话框
 */
const openSettings = () => {
  appStore.showSettings = true
}

/**
 * 根据当前主题动态计算应显示的图标
 */
const themeIcon = computed(() => {
  return currentTheme.value === 'light' ? Sunny : Moon
})

/**
 * 根据当前主题动态计算提示文本
 */
const themeTitle = computed(() => {
  return currentTheme.value === 'light' ? '切换到深色模式' : '切换到亮色模式'
})

const handleDelete = async () => {
  try {
    await ElMessageBox.confirm('确定要删除剪贴板内容和所有文件吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      buttonSize: 'default',
      type: 'warning',
    })
    await deleteKeyword()
  } catch (error) {
    // 用户取消操作时，ElMessageBox会抛出 'cancel'，这里无需处理
  }
}
</script>

<template>
  <header class="page-header">
    <div class="header-title">
      <span>剪切板</span>
    </div>
    <div class="header-actions">
      <el-button
        type="danger"
        v-if="!appStore.viewMode"
        @click="handleDelete"
        :icon="Delete"
        text
      />
      <el-button
        type="primary"
        @click="appStore.setShowQRCodeDialog(true)"
        :icon="InfoFilled"
        text
        v-show="!appStore.viewMode && appStore.keyword.id"
        class="mobile-info-btn"
      />
      <el-button
        :icon="Setting"
        v-if="!appStore.viewMode"
        text
        title="设置"
        @click="openSettings"
      />
      <el-button :icon="themeIcon" text :title="themeTitle" @click="toggleTheme" />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.header-title span {
  font-size: 1.5rem; /* 24px */
  font-weight: 600;
  color: var(--color-heading);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem; /* 8px */
}

.mobile-info-btn {
  display: none;
}

@media (max-width: 992px) {
  .mobile-info-btn {
    display: inline-flex;
  }
}
</style>
