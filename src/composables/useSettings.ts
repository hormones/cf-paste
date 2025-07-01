/**
 * 设置管理 Composable - 重构版
 * 使用统一的 Store 管理状态，Composable 只负责业务逻辑
 */
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { dataApi } from '@/api/data'
import { useAppStore } from '@/stores'
import { Constant } from '@/constant'

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
    appStore.setSettingsLoading(true)
    try {
      const settings = {
        expire_value: appStore.expiry,
        password: appStore.password || undefined
      }

      await dataApi.saveSettings(settings)

      // 更新本地状态
      const updatedKeyword = {
        ...appStore.keyword,
        expire_value: appStore.expiry,
        password: appStore.password || undefined,
        expire_time: Date.now() + appStore.expiry * 1000
      }
      appStore.setKeyword(updatedKeyword)

      appStore.setShowSettings(false)
      ElMessage.success(Constant.MESSAGES.SETTINGS_SAVED)
    } catch (error) {
      ElMessage.error('保存设置失败')
      throw error
    } finally {
      appStore.setSettingsLoading(false)
    }
  }

  return {
    // 状态 (来自 Store)
    showSettings: computed(() => appStore.showSettings),
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
    loading: computed(() => appStore.settingsLoading),

    // 业务方法
    openSettings,
    closeSettings,
    saveSettings,
  }
}
