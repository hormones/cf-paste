<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '@/stores'
import { passApi } from '@/api/pass'
import { useMain } from '@/composables/useMain'
import { useFileUpload } from '@/composables/useFileUpload'
import { ElDialog, ElForm, ElFormItem, ElInput, ElButton } from 'element-plus'
import { useI18n } from '@/composables/useI18n'

const store = useAppStore()
const { t } = useI18n()

const { fetchKeyword } = useMain()
const { fetchFileList } = useFileUpload()

const password = ref('')
const loading = ref(false)

const handleClose = () => {
  store.showPasswordDialog = false
}

const submitForm = async () => {
  if (!password.value) {
    return
  }
  loading.value = true
  try {
    await passApi.verifyPassword(password.value)
    handleClose() // Close dialog after successful verification
    // After successful verification, load data directly
    const keywordData = await fetchKeyword()
    if (keywordData) {
      await fetchFileList()
    }
  } catch (error: any) {
    // Error handling is completed in request interceptor
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="store.showPasswordDialog"
    :title="t('auth.passwordRequired')"
    width="380px"
    :append-to-body="true"
    :close-on-click-modal="false"
    :show-close="false"
    :destroy-on-close="true"
    custom-class="modern-dialog"
    @close="handleClose"
    @submit.prevent="submitForm"
  >
    <el-input
      v-model="password"
      type="password"
      :placeholder="t('auth.enterPassword')"
      show-password
      clearable
      autofocus
      size="large"
    />
    <template #footer>
      <el-button
        type="primary"
        :loading="loading"
        @click="submitForm"
        style="width: 100%"
        size="large"
      >
        {{ t('common.buttons.confirm') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
/* Modern dialog styling */
.modern-dialog {
  border-radius: 12px; /* Larger rounded corners */
}

:deep(.modern-dialog .el-dialog__header) {
  text-align: center;
  padding-bottom: 12px;
  border-bottom: none;
  margin-right: 0;
}

:deep(.modern-dialog .el-dialog__title) {
  font-size: 20px;
  font-weight: 600;
}

:deep(.modern-dialog .el-dialog__body) {
  padding: 10px 25px;
}

:deep(.modern-dialog .el-dialog__footer) {
  padding: 12px 25px 25px;
}
</style>
