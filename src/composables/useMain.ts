/**
 * 剪贴板管理 Composable - 重构版
 * 使用统一的 Store 管理状态，Composable 只负责业务逻辑
 */
import { ElMessage } from 'element-plus'
import { dataApi } from '@/api/data'
import { useAppStore } from '@/stores'
import type { Keyword } from '@/types'
import { Constant } from '@/constant'

export function useMain() {
  const appStore = useAppStore()

  /**
   * 获取keyword
   */
  const fetchKeyword = async () => {
    appStore.setLoading(true)
    try {
      const data = await dataApi.getKeyword()
      if (data) {
        appStore.setKeyword(data)
        appStore.viewMode = !data.word
      } else {
        appStore.viewMode = false
      }
      appStore.setLastSavedContent(appStore.keyword.content || '')
      return data
    } catch (response: any) {
      handleFetchError(response)
      throw response
    } finally {
      appStore.setLoading(false)
    }
  }

  /**
   * 处理获取错误
   */
  const handleFetchError = (response: any) => {
    if (response?.status === 401) {
      appStore.setShowPasswordDialog(true)
    } else {
      console.error(response)
      ElMessage.error(response?.msg || response?.error || Constant.MESSAGES.FETCH_FAILED)
    }
  }

  /**
   * 保存剪贴板内容
   */
  const saveKeyword = async (silent = false) => {
    appStore.setLoading(true)
    try {
      const currentTime = Date.now()

      if (appStore.keyword.id) {
        // 更新现有记录
        const data: Partial<Keyword> = {
          content: appStore.keyword.content,
        }
        await dataApi.updateKeyword(data)

        // 更新前端的update_time
        appStore.updateKeywordFields({
          update_time: currentTime,
        })
      } else {
        // 创建新记录
        const data: Keyword = {
          word: appStore.keyword.word,
          view_word: appStore.keyword.view_word,
          content: appStore.keyword.content,
          expire_time: appStore.keyword.expire_time,
        }
        const id = await dataApi.createKeyword(data)

        // 创建成功后更新前端的时间字段
        appStore.updateKeywordFields({
          id,
          create_time: currentTime,
          update_time: currentTime,
        })
      }

      appStore.setLastSavedContent(appStore.keyword.content || '')

      if (!silent) {
        ElMessage.success(Constant.MESSAGES.SAVE_SUCCESS)
      }
    } catch (error) {
      ElMessage.error(Constant.MESSAGES.SAVE_FAILED)
      throw error
    } finally {
      appStore.setLoading(false)
    }
  }

  /**
   * 删除keyword
   */
  const deleteKeyword = async () => {
    try {
      await dataApi.deleteKeyword()
      appStore.resetKeyword()
      ElMessage.success(Constant.MESSAGES.DELETE_SUCCESS)
    } catch (error) {
      ElMessage.error(Constant.MESSAGES.DELETE_FAILED)
      throw error
    }
  }

  /**
   * 复制只读链接
   */
  const copyReadOnlyLink = async () => {
    try {
      const fullUrl = `${window.location.origin}${appStore.readOnlyUrl}`
      await navigator.clipboard.writeText(fullUrl)
      ElMessage.success('链接已复制到剪贴板')
    } catch (error) {
      // 兜底方案：使用传统方法复制
      const textArea = document.createElement('textarea')
      textArea.value = `${window.location.origin}${appStore.readOnlyUrl}`
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      ElMessage.success('链接已复制到剪贴板')
    }
  }

  /**
   * 重置只读链接
   */
  const resetViewWord = async () => {
    appStore.setLoading(true)
    try {
      const response = await dataApi.resetViewWord()
      if (response.view_word) {
        appStore.updateKeywordFields({ view_word: response.view_word })
        ElMessage.success('只读链接已更新')
      }
    } catch (error) {
      ElMessage.error('重置失败，请稍后重试')
      throw error
    } finally {
      appStore.setLoading(false)
    }
  }

  return {
    fetchKeyword,
    saveKeyword,
    deleteKeyword,
    copyReadOnlyLink,
    resetViewWord,
  }
}
