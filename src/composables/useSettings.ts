/**
 * 设置管理 Composable
 * 负责过期时间、密码等设置的管理
 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { dataApi } from '@/api/data'
import { Constant } from '@/constant'

export function useSettings() {
  // 设置状态
  const showSettings = ref(false)
  const password = ref('')
  const expiry = ref(Constant.EXPIRY_OPTIONS[2].value) // 默认3天
  const loading = ref(false)

  /**
   * 打开设置对话框
   */
  const openSettings = (currentPassword?: string, currentExpiry?: number) => {
    password.value = currentPassword || ''
    expiry.value = currentExpiry || Constant.EXPIRY_OPTIONS[2].value
    showSettings.value = true
  }

  /**
   * 关闭设置对话框
   */
  const closeSettings = () => {
    showSettings.value = false
    password.value = ''
    expiry.value = Constant.EXPIRY_OPTIONS[2].value
  }

  /**
   * 保存设置
   */
  const saveSettings = async () => {
    loading.value = true
    try {
      await dataApi.saveSettings({
        expire_value: expiry.value,
        password: password.value,
      })

      ElMessage.success(Constant.MESSAGES.SETTINGS_SAVED)
      closeSettings()

      return true
    } catch (error) {
      ElMessage.error('保存设置失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取过期选项
   */
  const getExpiryOptions = () => Constant.EXPIRY_OPTIONS

  return {
    // 状态
    showSettings,
    password,
    expiry,
    loading,

    // 方法
    openSettings,
    closeSettings,
    saveSettings,
    getExpiryOptions
  }
}
