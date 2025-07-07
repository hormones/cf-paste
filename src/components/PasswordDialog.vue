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
    width="420px"
    :append-to-body="true"
    :close-on-click-modal="false"
    :show-close="false"
    :destroy-on-close="true"
    @close="handleClose"
  >
    <el-form label-position="top" @submit.prevent="submitForm">
      <el-form-item label="访问密码">
        <el-input
          v-model="password"
          type="password"
          placeholder="此内容受密码保护"
          show-password
          clearable
          autofocus
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button type="primary" :loading="loading" @click="submitForm" style="width: 100%">
          确 认
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<style scoped>
/* 使用 ElForm 后，大部分自定义样式可以移除，保持与设置对话框一致 */
</style>
