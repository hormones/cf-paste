<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { ElTabs, ElTabPane, ElSwitch } from 'element-plus'
import { Moon, Sunny, TrendCharts, Document } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores'
import { useAdminStore } from '@/stores/admin'
import { useI18n } from '@/composables/useI18n'
import type { AdminTab } from '@/stores/admin'

// Define props and emits for v-model support
const props = defineProps<{
  modelValue: AdminTab
}>()

const emit = defineEmits<{
  'update:modelValue': [value: AdminTab]
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

// Dynamic theme icon and label
const themeIcon = computed(() => {
  return currentTheme.value === 'light' ? Moon : Sunny
})

const themeLabel = computed(() => {
  return currentTheme.value === 'light'
    ? (t('app.theme.dark') || 'Dark')
    : (t('app.theme.light') || 'Light')
})

// Handle theme toggle
const handleThemeToggle = (value: string | number | boolean) => {
  toggleTheme()
}

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

      <!-- Theme Toggle -->
      <div class="theme-toggle">
        <div class="theme-control">
          <el-icon class="theme-icon">
            <component :is="themeIcon" />
          </el-icon>
          <span class="theme-label">{{ themeLabel }}</span>
          <el-switch
            :model-value="currentTheme === 'dark'"
            @change="handleThemeToggle"
            inline-prompt
            :active-icon="Moon"
            :inactive-icon="Sunny"
            active-color="var(--el-color-primary)"
            inactive-color="var(--el-color-info)"
            class="theme-switch"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-tab-bar {
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
}

.tab-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  min-height: 56px;
}

.tab-navigation {
  flex: 1;
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

/* Theme toggle */
.theme-toggle {
  flex-shrink: 0;
  margin-left: 2rem;
}

.theme-control {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--el-bg-color-page);
  border: 1px solid var(--el-border-color);
  transition: all 0.2s ease-in-out;
}

.theme-control:hover {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-7);
}

.theme-icon {
  font-size: 1rem;
  color: var(--el-text-color-regular);
}

.theme-label {
  font-size: 0.85rem;
  color: var(--el-text-color-regular);
  min-width: 32px;
}

.theme-switch {
  --el-switch-on-color: var(--el-color-primary);
  --el-switch-off-color: var(--el-color-info);
}

/* Responsive design */
@media (max-width: 768px) {
  .tab-container {
    flex-direction: column;
    padding: 1rem;
    gap: 1rem;
    min-height: auto;
  }

  .tab-navigation {
    width: 100%;
    order: 1;
  }

  .theme-toggle {
    width: 100%;
    margin-left: 0;
    order: 2;
  }

  .theme-control {
    justify-content: center;
    width: 100%;
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

  .tab-label {
    gap: 4px;
  }

  .tab-text {
    display: none; /* Hide text on very small screens, show only icons */
  }

  .theme-label {
    display: none; /* Hide theme label on very small screens */
  }

  :deep(.admin-tabs .el-tabs__item) {
    padding: 0 8px;
    min-width: 44px;
  }
}

/* Animation for tab switching */
:deep(.admin-tabs .el-tabs__content) {
  padding: 0;
}

.theme-switch:focus-within {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
  border-radius: 4px;
}
</style>
