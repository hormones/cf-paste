<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { ElContainer, ElMain } from 'element-plus'
import { useAppStore } from '@/stores'
import { useAdminStore } from '@/stores/admin'
import { adminApi } from '@/api/admin'
import { passApi } from '@/api/pass'
import { useI18n } from '@/composables/useI18n'

// Components
import AdminLoginCard from '@/components/admin/AdminLoginCard.vue'
import AdminTabBar from '@/components/admin/AdminTabBar.vue'
import AdminOverviewTab from '@/components/admin/AdminOverviewTab.vue'
import AdminLogTab from '@/components/admin/AdminLogTab.vue'

const { t, initializeLanguage } = useI18n()
const appStore = useAppStore()
const adminStore = useAdminStore()
const { showLogin, currentTab } = storeToRefs(adminStore)

// Ensure admin dashboard respects server config (language etc.)
const loadAdminConfig = async () => {
  try {
    const config = await passApi.getPasteConfig()
    appStore.setPasteConfig(config)
  } catch (error) {
    console.error('Failed to fetch admin config:', error)
  } finally {
    initializeLanguage()
  }
}

onMounted(() => {
  loadAdminConfig()
})

// Handle successful login
const handleLoginSuccess = () => {
  adminStore.handleLoginSuccess()
}

// Handle logout
const handleLogout = () => {
  adminApi.logout()
  adminStore.handleLogout()
}
</script>

<template>
  <div class="admin-dashboard">
    <!-- 登录界面 (当需要认证时) -->
    <div v-if="showLogin" class="login-container">
      <div class="login-wrapper">
        <AdminLoginCard @login-success="handleLoginSuccess" />
      </div>
    </div>

    <!-- 管理仪表板 (当已认证时) -->
    <el-container v-else class="dashboard-container" direction="vertical">
      <!-- Modern Header with Tabs -->
      <div class="modern-header">
        <AdminTabBar
          v-model="currentTab"
          @logout="handleLogout"
        />
      </div>

      <!-- Dashboard Main Content -->
      <el-main class="dashboard-main">
        <div class="dashboard-content">

          <!-- Tab Content -->
          <div class="tab-content">
            <!-- Overview Tab -->
            <AdminOverviewTab v-if="currentTab === 'overview'" />

            <!-- Logs Tab -->
            <AdminLogTab v-else-if="currentTab === 'logs'" />
          </div>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<style scoped>
.admin-dashboard {
  min-height: 100vh;
  background-color: var(--el-bg-color-page);
}

/* Login state */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 2rem;
  background: linear-gradient(
    135deg,
    var(--el-color-primary-light-9) 0%,
    var(--el-color-primary-light-8) 100%
  );
}

.login-wrapper {
  width: 100%;
  max-width: 400px;
}

/* Dashboard state */
.dashboard-container {
  min-height: 100vh;
  height: 100%;
}

.modern-header {
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter, var(--el-border-color));
  flex-shrink: 0;
}

.dashboard-main {
  padding: 0;
  background: var(--el-bg-color-page);
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  z-index: 1; /* Create stacking context but keep it low */
}

.dashboard-content {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.tab-content {
  flex: 1;
  padding: 2rem;
  padding-bottom: 4rem; /* Add extra bottom padding to prevent content cutoff */
}

/* Responsive design */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    padding: 1rem;
    gap: 1rem;
  }

  .header-title {
    flex: 1;
  }

  .header-actions {
    align-self: flex-end;
  }

  .tab-content {
    padding: 1rem;
    padding-bottom: 3rem; /* Extra bottom padding on tablet */
  }

  .login-container {
    padding: 1rem;
  }
}
</style>
