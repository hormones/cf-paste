<script setup lang="ts">
import { useAppStore } from '@/stores'
import { useSettings } from '@/composables/useSettings'

const appStore = useAppStore()
const { closeSettings, saveSettings } = useSettings()
</script>

<template>
  <!-- 设置对话框: 使用 ElDialog 和 ElForm 重构 -->
  <el-dialog
    v-model="appStore.showSettings"
    title="设置"
    width="380px"
    :append-to-body="true"
    :close-on-click-modal="false"
    custom-class="modern-dialog"
    @close="closeSettings"
  >
    <div class="setting-item">
      <div class="setting-label">
        <span>过期时间</span>
        <small>链接和文件将在指定时间后失效</small>
      </div>
      <el-select v-model="appStore.expiry" placeholder="选择有效期" style="width: 100%" size="large">
        <el-option
          v-for="option in appStore.getExpiryOptions()"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
    </div>

    <div class="setting-item">
      <div class="setting-label">
        <span>访问密码</span>
        <small>为您的内容添加密码保护</small>
      </div>
      <el-input
        v-model="appStore.password"
        placeholder="留空则不设密码"
        show-password
        clearable
        size="large"
      />
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="closeSettings" size="large">取消</el-button>
        <el-button type="primary" @click="saveSettings" size="large">保存设置</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<style scoped>
.setting-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.setting-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label span {
  font-size: 15px;
  color: var(--el-text-color-primary);
}

.setting-label small {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
