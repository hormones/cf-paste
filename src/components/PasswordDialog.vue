<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { verifyApi } from '@/api'

const modelValue = defineModel<boolean>()

const emit = defineEmits<{
  'verified': []
}>()

const password = ref('')
const loading = ref(false)

const handleClose = () => {
  password.value = ''
  modelValue.value = false
}

const handleVerify = async () => {
  if (!password.value) {
    ElMessage.warning('请输入密码')
    return
  }

  loading.value = true
  try {
    await verifyApi.verify(password.value)
    ElMessage.success('验证成功')
    emit('verified')
    handleClose()
  } catch (_error: any) {
    ElMessage.error('密码错误')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-dialog
    v-model="modelValue"
    title="需要密码"
    width="300px"
    center
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    class="password-dialog"
  >
    <div class="dialog-content">
      <el-input
        v-model="password"
        type="password"
        placeholder="请输入密码"
        @keyup.enter="handleVerify"
      />
    </div>
    <template #footer>
      <el-button type="primary" :loading="loading" @click="handleVerify">
        确认
      </el-button>
    </template>
  </el-dialog>
</template>

<style>
.dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.dialog-content .el-input {
  width: 100%;
  max-width: 260px;
}

/* 自定义对话框蒙层的样式 */
.el-overlay-dialog {
  backdrop-filter: blur(10px); /* 设置毛玻璃效果 */
  -webkit-backdrop-filter: blur(10px); /* 兼容Safari浏览器 */
}
</style>
