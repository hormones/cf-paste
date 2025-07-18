import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { dataApi } from '@/api/data'
import { useAppStore } from '@/stores'
import { EXPIRY_VALUES } from '@/constants'
import { useI18n } from './useI18n'
import { useMain } from '@/composables/useMain'

export function useSettings() {
  const appStore = useAppStore()
  const { t } = useI18n()
  const { saveKeyword } = useMain()

  const openSettings = () => {
    // Read current settings from keyword - show ****** if password exists, empty string if none
    const passwordValue = appStore.keyword.password || ''
    appStore.setSettingsData({
      password: passwordValue,
      expiry: appStore?.keyword?.expire_value || EXPIRY_VALUES[2],
    })
    appStore.setShowSettings(true)
  }

  const closeSettings = () => {
    appStore.setShowSettings(false)
    appStore.resetSettings()
  }

  const saveSettings = async () => {
    appStore.setLoading(true)
    try {
      const settings = {
        expire_value: appStore.expiry,
        password: appStore.password || undefined,
      }

      if (!appStore.keyword.id) {
        try {
          await saveKeyword(true) // silent 模式
        } catch (e) {
          ElMessage.error(t('common.msg.saveFailed'))
          return
        }
      }

      const response = await dataApi.saveSettings(settings)

      // Update local state with server response
      const updatedFields: Partial<Keyword> = {
        expire_value: appStore.expiry,
        password: appStore.password || undefined,
        expire_time: Date.now() + appStore.expiry * 1000,
      }

      if (response.view_word) {
        updatedFields.view_word = response.view_word
      }

      appStore.updateKeyword(updatedFields)

      appStore.setShowSettings(false)
      ElMessage.success(t('common.msg.saveSuccess'))
    } catch (error) {
      ElMessage.error(t('common.msg.saveFailed'))
      throw error
    } finally {
      appStore.setLoading(false)
    }
  }

  return {
    // State (from Store)
    password: computed({
      get: () => appStore.password,
      set: (value: string) =>
        appStore.setSettingsData({
          password: value,
          expiry: appStore.expiry,
        }),
    }),
    expiry: computed({
      get: () => appStore.expiry,
      set: (value: number) =>
        appStore.setSettingsData({
          password: appStore.password,
          expiry: value,
        }),
    }),

    openSettings,
    closeSettings,
    saveSettings,
  }
}
