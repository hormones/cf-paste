<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { dataApi } from '@/api'
import GlassDialog from './GlassDialog.vue'

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
    await dataApi.verify(password.value)
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
  <GlassDialog
    v-model:visible="modelValue"
    title="需要密码"
    size="small"
    :close-on-click-outside="false"
    :show-close="false"
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
