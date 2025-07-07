<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores'
import { ElButton, ElIcon } from 'element-plus'
import { Setting, Moon, Sunny, Plus } from '@element-plus/icons-vue'

const appStore = useAppStore()
const { theme: currentTheme } = storeToRefs(appStore)
const { toggleTheme } = appStore // 直接解构新的 action

const router = useRouter()

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
</script>

<template>
  <header class="page-header">
    <div class="header-title">
      <span>剪切板</span>
    </div>
    <div class="header-actions">
      <el-button :icon="themeIcon" text circle :title="themeTitle" @click="toggleTheme" />
      <el-button :icon="Setting" text circle title="设置" @click="openSettings" />
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
</style>
