<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { ElButton, ElPageHeader } from 'element-plus'
import { Moon, Sunny, SwitchButton } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores'
import type { AdminTab } from '@/stores/admin'
import { useAdminStore } from '@/stores/admin'
import { useI18n } from '@/composables/useI18n'

// Define props and emits for v-model support
const props = defineProps<{
  modelValue: AdminTab
}>()

const emit = defineEmits<{
  'update:modelValue': [value: AdminTab]
  logout: []
}>()

const { t } = useI18n()
const appStore = useAppStore()
const adminStore = useAdminStore()

// Theme management from app store (not admin-specific)
const { theme: currentTheme } = storeToRefs(appStore)
const { toggleTheme } = appStore

// Computed for v-model binding
const activeTab = computed({
  get: () => props.modelValue,
  set: (value: AdminTab) => {
    emit('update:modelValue', value)
    // Also update admin store
    adminStore.setCurrentTab(value)
  }
})

// Dynamic theme icon based on current theme (same as PageHeader)
const themeIcon = computed(() => {
  return currentTheme.value === 'light' ? Sunny : Moon
})

// Dynamic tooltip text based on current theme (same as PageHeader)
const themeTitle = computed(() => {
  return currentTheme.value === 'light'
    ? t('app.theme.toDark')
    : t('app.theme.toLight')
})

// Tab configuration
const tabs = [
  {
    name: 'overview' as AdminTab,
    label: t('admin.tabs.overview')
  },
  {
    name: 'logs' as AdminTab,
    label: t('admin.tabs.logs')
  }
]

// Handle tab click
const handleTabClick = (tabName: AdminTab) => {
  activeTab.value = tabName
}
</script>

<template>
  <div class="admin-tab-bar">
    <el-page-header class="page-header"
                    icon=""
                    :title="t('admin.dashboard.title')"
    >
      <!-- Left content: Title and Tabs -->
      <template #content>
        <div class="header-left">
          <div class="tabs">
            <div
              v-for="tab in tabs"
              :key="tab.name"
              class="tab-item"
              :class="{ 'is-active': activeTab === tab.name }"
              @click="handleTabClick(tab.name)"
            >
              {{ tab.label }}
            </div>
          </div>
        </div>
      </template>

      <!-- Right actions: Theme toggle and Logout -->
      <template #extra>
        <div class="header-actions">
          <!-- Theme Toggle Button -->
          <el-button
            :icon="themeIcon"
            circle
            text
            :title="themeTitle"
            @click="toggleTheme"
          />

          <!-- Logout Button -->
          <el-button
            :icon="SwitchButton"
            text
            @click="emit('logout')"
            class="logout-btn"
          >
            {{ t('admin.auth.logout') }}
          </el-button>
        </div>
      </template>
    </el-page-header>
  </div>
</template>

<style scoped>
.admin-tab-bar {
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.page-header {
  padding: 16px 32px;
  --el-page-header-bg-color: transparent;
}

/* Left side: Title and Tabs */
.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.tabs {
  display: flex;
  gap: 8px;
}

.tab-item {
  padding: 6px 16px;
  font-size: 14px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  user-select: none;
}

.tab-item:hover {
  color: var(--el-text-color-primary);
  background-color: var(--el-fill-color-light);
}

.tab-item.is-active {
  color: var(--el-color-primary);
  font-weight: 500;
  background-color: var(--el-color-primary-light-9);
}

/* Right side: Actions */
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logout-btn {
  font-size: 14px;
  color: var(--el-color-primary);
}

.logout-btn:hover {
  color: var(--el-color-primary-light-3);
}

/* Responsive design */
@media (max-width: 768px) {
  .page-header {
    padding: 12px 16px;
  }

  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .tabs {
    width: 100%;
    gap: 4px;
  }

  .tab-item {
    flex: 1;
    text-align: center;
    padding: 6px 12px;
    font-size: 13px;
  }

  .header-actions {
    gap: 8px;
  }

  .logout-btn {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .page-header {
    padding: 10px 12px;
  }

  .tab-item {
    padding: 5px 10px;
    font-size: 12px;
  }

  .logout-btn {
    font-size: 12px;
  }
}
</style>
