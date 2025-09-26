<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { ElContainer, ElHeader, ElMain, ElAlert, ElButton, ElIcon } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
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
const { isAuthenticated, currentTab, loading } = storeToRefs(adminStore)

// Local state
const authChecking = ref(true)
const authError = ref('')

// Check authentication status on mount
onMounted(async () => {
  try {
    // Initialize admin auth state from cookie
    adminStore.initAuth()

    // If we have a cookie, verify it's still valid by making a test request
    if (adminStore.hasAuthCookie) {
      try {
        // Test auth with a lightweight request
        await adminApi.getOverview()
        adminStore.setAuth('')  // Set authenticated state
      } catch (error) {
        // Auth failed, clear invalid cookie
        adminApi.logout()
        authError.value = 'Session expired, please login again'
      }
    }
  } catch (error) {
    console.error('Admin auth check failed:', error)
    authError.value = 'Authentication check failed'
  } finally {
    authChecking.value = false
  }
})

// Handle successful login
const handleLoginSuccess = () => {
  authError.value = ''
  adminStore.initAuth()
}

// Handle logout
const handleLogout = () => {
  adminApi.logout()
  adminStore.clearAuth()
}
</script>

<template>
  <div class="admin-dashboard">
    <!-- Loading state during auth check -->
    <div v-if="authChecking" class="loading-container">
      <div class="loading-content">
        <el-icon class="loading-icon">
          <Loading />
        </el-icon>
        <p>{{ t('admin.auth.checking') || 'Checking authentication...' }}</p>
      </div>
    </div>

    <!-- Authentication error -->
    <div v-else-if="authError" class="error-container">
      <el-alert
        :title="authError"
        type="error"
        show-icon
        :closable="false"
        class="auth-error"
      />
    </div>

    <!-- Login form (when not authenticated) -->
    <div v-else-if="!isAuthenticated" class="login-container">
      <div class="login-wrapper">
        <AdminLoginCard @login-success="handleLoginSuccess" />
      </div>
    </div>

    <!-- Admin Dashboard (when authenticated) -->
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

/* Loading state */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

.loading-content {
  text-align: center;
}

.loading-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Error state */
.error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 2rem;
}

.auth-error {
  max-width: 500px;
}

/* Login state */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 2rem;
  background: linear-gradient(135deg, var(--el-color-primary-light-9) 0%, var(--el-color-primary-light-8) 100%);
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

/* Placeholder styles */
.content-placeholder {
  text-align: center;
  padding: 2rem;
  color: var(--el-text-color-regular);
  background: var(--el-bg-color);
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
}

.content-placeholder h3 {
  margin-bottom: 1rem;
  color: var(--el-text-color-primary);
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