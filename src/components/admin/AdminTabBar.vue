<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { ElTabs, ElTabPane, ElButton } from 'element-plus'
import { Moon, Sunny, TrendCharts, Document } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores'
import { useAdminStore } from '@/stores/admin'
import { useI18n } from '@/composables/useI18n'
import type { AdminTab } from '@/stores/admin'

// Define props and emits for v-model support
const props = defineProps<{
  modelValue: AdminTab
  showTitle?: boolean
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
    label: t('admin.tabs.overview') || 'Overview',
    icon: TrendCharts
  },
  {
    name: 'logs' as AdminTab,
    label: t('admin.tabs.logs') || 'Detailed Logs',
    icon: Document
  }
]
</script>

<template>
  <div class="admin-tab-bar">
    <div class="tab-container">
      <!-- App Title -->
      <div v-if="showTitle" class="app-title">
        <h1>{{ t('admin.dashboard.title') || 'Admin Dashboard' }}</h1>
      </div>

      <!-- Tab Navigation -->
      <div class="tab-navigation">
        <el-tabs
          v-model="activeTab"
          type="border-card"
          class="admin-tabs"
        >
          <el-tab-pane
            v-for="tab in tabs"
            :key="tab.name"
            :name="tab.name"
            :label="tab.label"
          >
            <template #label>
              <div class="tab-label">
                <el-icon class="tab-icon">
                  <component :is="tab.icon" />
                </el-icon>
                <span class="tab-text">{{ tab.label }}</span>
              </div>
            </template>
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- Header Actions -->
      <div class="header-actions">
        <!-- Theme Toggle Button (same as PageHeader) -->
        <el-button
          size="small"
          :icon="themeIcon"
          text
          :title="themeTitle"
          @click="toggleTheme"
        />

        <!-- Logout Button -->
        <el-button
          type="primary"
          text
          @click="emit('logout')"
          class="logout-btn"
        >
          {{ t('admin.auth.logout') || 'Logout' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-tab-bar {
  background: var(--el-bg-color);
}

.tab-container {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 1rem 2rem;
  min-height: 60px;
}

.app-title {
  flex-shrink: 0;
}

.app-title h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.tab-navigation {
  flex: 1;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

:deep(.admin-tabs .el-tabs__header) {
  margin: 0;
}

:deep(.admin-tabs .el-tabs__item.is-active) {
  border-color: var(--el-border-color);
  border-bottom-color: transparent;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-icon {
  font-size: 1rem;
}

.tab-text {
  font-size: 0.9rem;
  font-weight: 500;
}

/* Logout button */
.logout-btn {
  --el-button-text-color: var(--el-color-primary);
  font-size: 0.9rem;
}

/* Responsive design */
@media (max-width: 768px) {
  .tab-container {
    flex-direction: column;
    padding: 1rem;
    gap: 1rem;
    min-height: auto;
  }

  .app-title {
    order: 0;
    align-self: flex-start;
  }

  .app-title h1 {
    font-size: 1.1rem;
  }

  .tab-navigation {
    width: 100%;
    order: 1;
  }

  .header-actions {
    width: 100%;
    order: 2;
    justify-content: space-between;
  }

  /* Mobile tabs */
  :deep(.admin-tabs .el-tabs__item) {
    flex: 1;
    text-align: center;
    margin-right: 2px;
    padding: 0 12px;
  }

  :deep(.admin-tabs .el-tabs__item:last-child) {
    margin-right: 0;
  }

  .tab-text {
    font-size: 0.8rem;
  }

  .tab-icon {
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .tab-container {
    padding: 0.75rem;
  }

  .app-title h1 {
    font-size: 1rem;
  }

  .tab-label {
    gap: 4px;
  }

  .tab-text {
    display: none; /* Hide text on very small screens, show only icons */
  }

  :deep(.admin-tabs .el-tabs__item) {
    padding: 0 8px;
    min-width: 44px;
  }

  .logout-btn {
    font-size: 0.8rem;
  }
}

/* Animation for tab switching */
:deep(.admin-tabs .el-tabs__content) {
  padding: 0;
}

</style>
