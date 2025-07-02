import { useAppStore } from '@/stores'
import { authApi } from '@/api/auth'
import { ElMessage } from 'element-plus'

export function useSession() {
  const appStore = useAppStore()

  /**
   * 获取一个有效的会话Token。
   * 如果Store中的Token有效，则直接返回；
   * 否则，从API获取新Token，更新Store，然后返回。
   * @returns {Promise<string>} 一个有效的会话Token
   */
  const getToken = async (): Promise<string> => {
    const now = Date.now()
    if (appStore.token && appStore.tokenExpiresAt > now) {
      return appStore.token
    }

    try {
      const res = await authApi.getToken()
      appStore.token = res.token
      appStore.tokenExpiresAt = res.expire_time
      return res.token
    } catch (error) {
      console.error('获取会话Token失败:', error)
      ElMessage.error('获取授权失败，请刷新页面后重试。')
      // 抛出错误，让调用方可以捕获并处理
      throw new Error('Failed to get session token')
    }
  }

  return {
    getToken,
  }
}
