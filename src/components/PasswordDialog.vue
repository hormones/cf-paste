<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '@/stores'
import GlassDialog from './GlassDialog.vue'
import { authApi } from '@/api/auth'
import { useMain } from '@/composables/useMain'
import { useFileUpload } from '@/composables/useFileUpload'

const store = useAppStore()
const dialogVisible = ref(false)

const { fetchKeyword } = useMain()
const { fetchFileList } = useFileUpload()

const password = ref('')
const loading = ref(false)

const submitForm = async () => {
  if (!password.value) {
    return
  }
  loading.value = true
  try {
    await authApi.verifyPassword(password.value)
    store.showPasswordDialog = false
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
  <GlassDialog
    v-model:visible="store.showPasswordDialog"
    title="请输入只读密码"
    size="small"
    :close-on-click-outside="false"
    :show-close="false"
  >
    <div class="dialog-content">
      <el-input
        v-model="password"
        type="password"
        placeholder="请输入密码"
        @keyup.enter="submitForm"
      />
    </div>
    <template #footer>
      <el-button type="primary" :loading="loading" @click="submitForm">
        确认
      </el-button>
    </template>
  </GlassDialog>
</template>

<style scoped>
.dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.dialog-content .el-input {
  width: 100%;
  max-width: 260px;
}
</style>
