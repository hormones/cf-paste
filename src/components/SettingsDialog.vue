<script setup lang="ts">
import { useAppStore } from '@/stores'
import { useSettings } from '@/composables/useSettings'
import { useI18nComposable } from '@/composables/useI18n'

const appStore = useAppStore()
const { closeSettings, saveSettings } = useSettings()
const { t, getExpiryOptions } = useI18nComposable()
</script>

<template>
  <el-dialog
    v-model="appStore.showSettings"
    :title="t('settings.title')"
    width="380px"
    :append-to-body="true"
    :close-on-click-modal="false"
    custom-class="modern-dialog"
    @close="closeSettings"
  >
    <div class="setting-item">
      <div class="setting-label">
        <span>{{ t('settings.expiry.label') }}</span>
        <small>{{ t('settings.expiry.desc') }}</small>
      </div>
      <el-select
        v-model="appStore.expiry"
        :placeholder="t('settings.expiry.placeholder')"
        style="width: 100%"
        size="large"
      >
        <el-option
          v-for="option in getExpiryOptions()"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
    </div>

    <div class="setting-item">
      <div class="setting-label">
        <span>{{ t('settings.password.label') }}</span>
        <small>{{ t('settings.password.desc') }}</small>
      </div>
      <el-input
        v-model="appStore.password"
        :placeholder="t('settings.password.placeholder')"
        show-password
        clearable
        size="large"
      />
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="closeSettings" size="large">{{ t('common.buttons.cancel') }}</el-button>
        <el-button type="primary" @click="saveSettings" size="large">{{ t('common.buttons.save') }}</el-button>
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
