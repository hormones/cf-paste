/**
 * 设置管理 Composable - 重构版
 * 使用统一的 Store 管理状态，Composable 只负责业务逻辑
 */
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { dataApi } from '@/api/data'
import { useAppStore } from '@/stores'
import { Constant } from '@/constant'
import type { Keyword } from '@/types'

export function useSettings() {
  const appStore = useAppStore()

    /**
   * 打开设置对话框
   */
  const openSettings = () => {
    // 从 keyword 中读取当前设置
    // 如果有密码，显示 ******；如果没有密码，显示空字符串
    const passwordValue = appStore.keyword.password || ''

    appStore.setSettingsData({
      password: passwordValue,
      expiry: appStore.keyword.expire_value || Constant.EXPIRY_OPTIONS[2].value
    })
    appStore.setShowSettings(true)
  }

  /**
   * 关闭设置对话框
   */
  const closeSettings = () => {
    appStore.setShowSettings(false)
    appStore.resetSettings()
  }

  /**
   * 保存设置
   */
  const saveSettings = async () => {
    appStore.setLoading(true)
    try {
      const settings = {
        expire_value: appStore.expiry,
        password: appStore.password || undefined,
      }

      const response = await dataApi.saveSettings(settings)

      // 更新本地状态
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
    // 状态 (来自 Store)
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
