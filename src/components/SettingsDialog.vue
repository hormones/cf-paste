<script setup lang="ts">
import { useAppStore } from '@/stores'
import { useSettings } from '@/composables/useSettings'

const appStore = useAppStore()
const { closeSettings, saveSettings } = useSettings()
</script>

<template>
  <el-dialog
    v-model="appStore.showSettings"
    title="Settings"
    width="380px"
    :append-to-body="true"
    :close-on-click-modal="false"
    custom-class="modern-dialog"
    @close="closeSettings"
  >
    <div class="setting-item">
      <div class="setting-label">
        <span>Expiration Time</span>
        <small>Links and files will expire after the specified time</small>
      </div>
      <el-select v-model="appStore.expiry" placeholder="Select validity period" style="width: 100%" size="large">
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
        <span>Access Password</span>
        <small>Add password protection to your content</small>
      </div>
      <el-input
        v-model="appStore.password"
        placeholder="Leave empty for no password"
        show-password
        clearable
        size="large"
      />
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="closeSettings" size="large">Cancel</el-button>
        <el-button type="primary" @click="saveSettings" size="large">Save Settings</el-button>
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
