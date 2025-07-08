import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { dataApi } from '@/api/data'
import { useAppStore } from '@/stores'
import { Constant } from '@/constant'
import type { Keyword } from '@/types'

export function useSettings() {
  const appStore = useAppStore()

  const openSettings = () => {
    // Read current settings from keyword - show ****** if password exists, empty string if none
    const passwordValue = appStore.keyword.password || ''

    appStore.setSettingsData({
      password: passwordValue,
      expiry: appStore.keyword.expire_value || Constant.EXPIRY_OPTIONS[2].value
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

      appStore.updateKeywordFields(updatedFields)

      appStore.setShowSettings(false)
      ElMessage.success(Constant.MESSAGES.SETTINGS_SAVED)
    } catch (error) {
      ElMessage.error(Constant.MESSAGES.SETTINGS_FAILED)
      throw error
    } finally {
      appStore.setLoading(false)
    }
  }

  return {
    // State (from Store)
    password: computed({
      get: () => appStore.password,
      set: (value: string) => appStore.setSettingsData({
        password: value,
        expiry: appStore.expiry
      })
    }),
    expiry: computed({
      get: () => appStore.expiry,
      set: (value: number) => appStore.setSettingsData({
        password: appStore.password,
        expiry: value
      })
    }),

    openSettings,
    closeSettings,
    saveSettings,
  }
}
