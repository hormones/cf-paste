<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElCard, ElForm, ElFormItem, ElInput, ElButton, ElAlert, ElMessage } from 'element-plus'
import { Lock, User } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { adminApi } from '@/api/admin'
import { useAdminStore } from '@/stores/admin'
import { useI18n } from '@/composables/useI18n'

// Define emits
const emit = defineEmits<{
  loginSuccess: []
}>()

const { t } = useI18n()
const adminStore = useAdminStore()

// Form reference
const formRef = ref<FormInstance>()

// Form data
const loginForm = reactive({
  password: ''
})

// Loading state
const loading = ref(false)

// Error state
const errorMessage = ref('')

// Form validation rules
const rules: FormRules = {
  password: [
    { required: true, message: t('admin.auth.passwordRequired'), trigger: 'blur' },
    { min: 6, message: t('admin.auth.passwordMinLength'), trigger: 'blur' }
  ]
}

// Handle form submission
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    // Validate form
    const valid = await formRef.value.validate()
    if (!valid) return

    // Clear previous error
    errorMessage.value = ''
    loading.value = true

    // Call login API
    const result = await adminApi.login({ password: loginForm.password })

    if (result.success) {
      // Login successful
      ElMessage.success(t('admin.auth.loginSuccess'))

      // Emit success event to parent
      emit('loginSuccess')

      // Reset form
      loginForm.password = ''
      formRef.value.resetFields()
    } else {
      // Login failed
      errorMessage.value = result.message || t('errors.incorrectPassword')
    }
  } catch (error: any) {
    console.error('Login error:', error)
    errorMessage.value = error?.message || t('errors.server')
  } finally {
    loading.value = false
  }
}

// Handle Enter key press
const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !loading.value) {
    handleSubmit()
  }
}

// Clear error when user starts typing
const clearError = () => {
  if (errorMessage.value) {
    errorMessage.value = ''
  }
}
</script>

<template>
  <el-card class="login-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <el-icon class="header-icon">
          <User />
        </el-icon>
        <h3 class="header-title">{{ t('admin.auth.title') }}</h3>
        <p class="header-subtitle">{{ t('admin.auth.description') }}</p>
      </div>
    </template>

    <!-- Error Alert -->
    <el-alert
      v-if="errorMessage"
      :title="errorMessage"
      type="error"
      show-icon
      :closable="false"
      class="error-alert"
    />

    <!-- Login Form -->
    <el-form
      ref="formRef"
      :model="loginForm"
      :rules="rules"
      label-position="top"
      size="large"
      @keypress="handleKeyPress"
    >
      <el-form-item
        prop="password"
        :label="t('admin.auth.password')"
      >
        <el-input
          v-model="loginForm.password"
          type="password"
          :placeholder="t('admin.auth.passwordPlaceholder')"
          :prefix-icon="Lock"
          show-password
          :disabled="loading"
          @input="clearError"
          autocomplete="current-password"
        />
      </el-form-item>

      <el-form-item>
        <el-button
          type="primary"
          size="large"
          :loading="loading"
          :disabled="!loginForm.password || loginForm.password.length < 6"
          @click="handleSubmit"
          class="login-button"
        >
          <span v-if="loading">{{ t('admin.auth.loggingIn') }}</span>
          <span v-else>{{ t('admin.auth.login') }}</span>
        </el-button>
      </el-form-item>
    </el-form>

    <!-- Security Notice -->
    <div class="security-notice">
      <p class="notice-text">
        {{ t('admin.auth.securityNotice') }}
      </p>
    </div>
  </el-card>
</template>

<style scoped>
.login-card {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.card-header {
  text-align: center;
  padding: 1rem 0;
}

.header-icon {
  font-size: 3rem;
  color: var(--el-color-primary);
  margin-bottom: 1rem;
}

.header-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.header-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: var(--el-text-color-regular);
  line-height: 1.4;
}

.error-alert {
  margin-bottom: 1.5rem;
}

.login-button {
  width: 100%;
  height: 48px;
  font-size: 1rem;
  font-weight: 500;
}

.login-button:disabled {
  cursor: not-allowed;
}

.security-notice {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--el-border-color-lighter);
  text-align: center;
}

.notice-text {
  margin: 0;
  font-size: 0.75rem;
  color: var(--el-text-color-placeholder);
  line-height: 1.4;
}

/* Form styling enhancements */
:deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

:deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-border-color) inset;
  transition: box-shadow 0.2s ease-in-out;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--el-color-primary-light-7) inset;
}

:deep(.el-input.is-focus .el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

/* Animation effects */
.login-card {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Loading state */
.login-button.is-loading {
  cursor: not-allowed;
}

/* Mobile responsive */
@media (max-width: 480px) {
  .login-card {
    margin: 0 1rem;
  }

  .header-icon {
    font-size: 2.5rem;
  }

  .header-title {
    font-size: 1.25rem;
  }

  .login-button {
    height: 44px;
  }
}
</style>
