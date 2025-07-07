<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '@/stores'
import { passApi } from '@/api/pass'
import { useMain } from '@/composables/useMain'
import { useFileUpload } from '@/composables/useFileUpload'
import { ElDialog, ElForm, ElFormItem, ElInput, ElButton } from 'element-plus'

const store = useAppStore()

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
    handleClose() // 验证成功后关闭对话框
    // 验证成功后，直接加载数据
    const keywordData = await fetchKeyword()
    if (keywordData) {
      await fetchFileList()
    }
  } catch (error: any) {
    // 错误处理已在请求拦截器中完成
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="store.showPasswordDialog"
    title="请输入密码"
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
      placeholder="请输入访问密码"
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
        确认
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
/* 现代化的对话框样式 */
:deep(.modern-dialog) {
  border-radius: 12px; /* 更大的圆角 */
}

:deep(.modern-dialog .el-dialog__header) {
  text-align: center;
  padding-bottom: 12px;
  /* 移除 header 和 body 之间的分隔线 */
  border-bottom: none;
  margin-right: 0;
}

:deep(.modern-dialog .el-dialog__title) {
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

:deep(.modern-dialog .el-dialog__body) {
  padding: 10px 25px;
}

:deep(.modern-dialog .el-dialog__footer) {
  padding: 12px 25px 25px;
}
</style>
