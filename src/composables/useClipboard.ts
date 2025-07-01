/**
 * 剪贴板管理 Composable - 重构版
 * 使用统一的 Store 管理状态，Composable 只负责业务逻辑
 */
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { dataApi } from '@/api/data'
import { useWordStore, useAppStore } from '@/stores'
import type { Keyword } from '@/types'
import { Utils } from '@/utils'
import { Constant } from '@/constant'

export function useClipboard() {
  const wordStore = useWordStore()
  const appStore = useAppStore()

  /**
   * 获取剪贴板内容
   */
  const fetchContent = async () => {
    appStore.setClipboardLoading(true)
    try {
      const data = await dataApi.getKeyword()
      if (data) {
        appStore.setKeyword(data)
        appStore.setLastSavedContent(data.content || '')
        // 注意：不要调用setViewWord，这会清除word状态并导致进入只读模式
        // 只有在删除或真正的只读模式下才需要设置view_word
      } else {
        appStore.setLastSavedContent(appStore.keyword.content || '')
      }
      return data
    } catch (response: any) {
      handleFetchError(response)
      throw response
    } finally {
      appStore.setClipboardLoading(false)
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
  const saveContent = async (silent = false) => {
    appStore.setClipboardLoading(true)
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
      appStore.setClipboardLoading(false)
    }
  }

  /**
   * 删除剪贴板内容
   */
  const deleteContent = async () => {
    try {
      await dataApi.deleteKeyword()
      // 重新生成view_word
      const newViewWord = Utils.getRandomWord(6)
      wordStore.setViewWord(newViewWord)
      // 清空cookie
      Utils.clearLocalStorageAndCookies()
      appStore.resetKeyword({
        word: wordStore.word ?? undefined,
        view_word: newViewWord,
      })
      ElMessage.success(Constant.MESSAGES.DELETE_SUCCESS)
    } catch (error) {
      ElMessage.error(Constant.MESSAGES.DELETE_FAILED)
      throw error
    }
  }

  /**
   * 密码验证完成回调
   */
  const handlePasswordVerified = () => {
    appStore.setShowPasswordDialog(false)
    fetchContent()
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

  return {
    // 状态 (来自 Store)
    loading: computed(() => appStore.clipboardLoading),
    keyword: computed(() => appStore.keyword),
    showPasswordDialog: computed(() => appStore.showPasswordDialog),

    // 计算属性 (来自 Store)
    hasUnsavedChanges: computed(() => appStore.hasUnsavedChanges),
    readOnlyLink: computed(() => appStore.readOnlyLink),
    readOnlyUrl: computed(() => appStore.readOnlyUrl),

    // 业务方法
    fetchContent,
    saveContent,
    deleteContent,
    handlePasswordVerified,
    copyReadOnlyLink,
  }
}
