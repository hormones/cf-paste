<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ElContainer, ElHeader, ElMain, ElButton } from 'element-plus'
import { useAdminStore } from '@/stores/admin'
import { adminApi } from '@/api/admin'
import { useI18n } from '@/composables/useI18n'

// Components
import AdminLoginCard from '@/components/admin/AdminLoginCard.vue'
import AdminTabBar from '@/components/admin/AdminTabBar.vue'
import AdminOverviewTab from '@/components/admin/AdminOverviewTab.vue'
import AdminLogTab from '@/components/admin/AdminLogTab.vue'

const { t } = useI18n()
const adminStore = useAdminStore()
const { showLogin, currentTab } = storeToRefs(adminStore)

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
      <!-- Dashboard Header -->
      <el-header class="dashboard-header">
        <div class="header-content">
          <div class="header-title">
            <h1>{{ t('admin.dashboard.title') || 'Admin Dashboard' }}</h1>
            <p class="header-subtitle">
              {{ t('admin.dashboard.subtitle') || 'System Statistics and Logs' }}
            </p>
          </div>
          <div class="header-actions">
            <el-button type="primary" plain @click="handleLogout">
              {{ t('admin.auth.logout') || 'Logout' }}
            </el-button>
          </div>
        </div>
      </el-header>

      <!-- Dashboard Main Content -->
      <el-main class="dashboard-main">
        <div class="dashboard-content">
          <!-- Tab Navigation -->
          <AdminTabBar v-model="currentTab" />

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
}

.dashboard-header {
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
  padding: 0;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 2rem;
}

.header-title h1 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 1.5rem;
  font-weight: 600;
}

.header-subtitle {
  margin: 0.25rem 0 0 0;
  color: var(--el-text-color-regular);
  font-size: 0.9rem;
}

.dashboard-main {
  padding: 0;
  background: var(--el-bg-color-page);
}

.dashboard-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tab-content {
  flex: 1;
  padding: 2rem;
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
  }

  .login-container {
    padding: 1rem;
  }
}
</style>

