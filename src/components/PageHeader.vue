<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores'
import { ElButton, ElMessageBox } from 'element-plus'
import { Setting, Moon, Sunny, InfoFilled, Delete } from '@element-plus/icons-vue'
import { useMain } from '@/composables/useMain'
import { useI18n } from '@/composables/useI18n'

const appStore = useAppStore()
const { deleteKeyword } = useMain()
const { theme: currentTheme } = storeToRefs(appStore)
const { toggleTheme } = appStore
const { t } = useI18n()

const openSettings = () => {
  appStore.showSettings = true
}

// Dynamic theme icon based on current theme
const themeIcon = computed(() => {
  return currentTheme.value === 'light' ? Sunny : Moon
})

// Dynamic tooltip text based on current theme
const themeTitle = computed(() => {
  return currentTheme.value === 'light'
    ? t('app.theme.toDark')
    : t('app.theme.toLight')
})

const handleDelete = async () => {
  try {
    await ElMessageBox.confirm(
      t('clipboard.deleteConfirm'),
      t('common.states.warning'),
      {
        confirmButtonText: t('common.buttons.confirm'),
        cancelButtonText: t('common.buttons.cancel'),
        buttonSize: 'default',
        type: 'warning',
      }
    )
    await deleteKeyword()
  } catch (error) {
    // User cancellation is handled by ElMessageBox, no additional processing needed
  }
}
</script>

<template>
  <header class="page-header">
    <div class="header-title">
      <span>{{ t('app.title') }}</span>
    </div>
    <div class="header-actions">
      <el-button
        size="small"
        type="danger"
        v-if="!appStore.viewMode"
        @click="handleDelete"
        :icon="Delete"
        text
      />
      <el-button
        size="small"
        type="primary"
        @click="appStore.setShowQRCodeDialog(true)"
        :icon="InfoFilled"
        text
        v-show="!appStore.viewMode && appStore.keyword.id"
        class="mobile-info-btn"
      />
      <el-button
        size="small"
        :icon="Setting"
        v-if="!appStore.viewMode"
        text
        :title="t('common.buttons.settings')"
        @click="openSettings"
      />
      <el-button
        size="small"
        :icon="themeIcon"
        text
        :title="themeTitle"
        @click="toggleTheme"
      />
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
