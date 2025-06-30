/**
 * 剪贴板管理 Composable
 * 负责剪贴板数据的获取、保存、更新等操作
 */
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { dataApi } from '@/api/data'
import { useWordStore } from '@/stores'
import type { Keyword } from '@/types'
import { Utils } from '@/utils'
import { Constant } from '@/constant'

export function useClipboard() {
  const wordStore = useWordStore()

  // 状态管理
  const loading = ref(false)
  const keyword = ref<Keyword>({
    word: wordStore.word,
    view_word: Utils.getRandomWord(6),
    content: '',
    expire_time: Date.now() + Constant.EXPIRY_OPTIONS[2].value * 1000,
    expire_value: Constant.EXPIRY_OPTIONS[2].value,
  })
  const lastSavedContent = ref('')

  // 密码相关
  const showPasswordDialog = ref(false)

  /**
   * 获取剪贴板内容
   */
  const fetchContent = async () => {
    loading.value = true
    try {
      const data = await dataApi.getKeyword()
      if (data) {
        keyword.value = data
        lastSavedContent.value = data.content || ''
        wordStore.setViewWord(keyword.value.view_word!)
      } else {
        lastSavedContent.value = keyword.value.content || ''
      }
      return data
    } catch (response: any) {
      handleFetchError(response)
      throw response
    } finally {
      loading.value = false
    }
  }

  /**
   * 处理获取错误
   */
  const handleFetchError = (response: any) => {
    if (response?.status === 401) {
      showPasswordDialog.value = true
    } else {
      console.error(response)
      ElMessage.error(
        response?.data?.msg || response?.data?.error || Constant.MESSAGES.FETCH_FAILED
      )
    }
  }

  /**
   * 保存剪贴板内容
   */
  const saveContent = async (silent = false) => {
    loading.value = true
    try {
      if (keyword.value.id) {
        // 更新现有记录
        const data: Partial<Keyword> = {
          content: keyword.value.content,
        }
        await dataApi.updateKeyword(data)
      } else {
        // 创建新记录
        const data: Keyword = {
          word: keyword.value.word,
          view_word: keyword.value.view_word,
          content: keyword.value.content,
          expire_time: keyword.value.expire_time,
        }
        keyword.value.id = await dataApi.createKeyword(data)
      }

      lastSavedContent.value = keyword.value.content || ''

      if (!silent) {
        ElMessage.success(Constant.MESSAGES.SAVE_SUCCESS)
      }
    } catch (error) {
      ElMessage.error(Constant.MESSAGES.SAVE_FAILED)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 删除剪贴板内容
   */
  const deleteContent = async () => {
    try {
      await dataApi.deleteKeyword()
      // 重新生成view_word
      wordStore.setViewWord(Utils.getRandomWord(6))
      // 清空cookie
      Utils.clearLocalStorageAndCookies()
      resetForm()
      ElMessage.success(Constant.MESSAGES.DELETE_SUCCESS)
    } catch (error) {
      ElMessage.error(Constant.MESSAGES.DELETE_FAILED)
      throw error
    }
  }

  /**
   * 重置表单
   */
  const resetForm = () => {
    keyword.value = {
      id: null,
      word: wordStore.word,
      view_word: wordStore.view_word,
      content: '',
      expire_time: Date.now() + Constant.EXPIRY_OPTIONS[2].value * 1000,
      expire_value: Constant.EXPIRY_OPTIONS[2].value,
    }
    lastSavedContent.value = ''
  }

  /**
   * 密码验证完成回调
   */
  const handlePasswordVerified = () => {
    showPasswordDialog.value = false
    fetchContent()
  }

  /**
   * 防抖保存
   */
  const createAutoSave = (delay = 1000) => {
    let timer: ReturnType<typeof setTimeout> | null = null
    return () => {
      // 检查内容是否有变化
      if ((keyword.value.content || '') === lastSavedContent.value) {
        return
      }

      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        saveContent() // 非静默保存
      }, delay)
    }
  }

  // 计算属性
  const hasUnsavedChanges = computed(() =>
    (keyword.value.content || '') !== lastSavedContent.value
  )

  const readOnlyLink = computed(() =>
    `${window.location.origin}/v/${keyword.value.view_word}`
  )

  const readOnlyUrl = computed(() => `/v/${keyword.value.view_word}`)

  const formatDate = (timestamp?: number) => {
    return !keyword.value.id ? '-' : new Date(timestamp || Date.now()).toLocaleString()
  }

  /**
   * 复制只读链接
   */
  const copyReadOnlyLink = async () => {
    try {
      const fullUrl = `${window.location.origin}${readOnlyUrl.value}`
      await navigator.clipboard.writeText(fullUrl)
      ElMessage.success('链接已复制到剪贴板')
    } catch (error) {
      // 兜底方案：使用传统方法复制
      const textArea = document.createElement('textarea')
      textArea.value = `${window.location.origin}${readOnlyUrl.value}`
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      ElMessage.success('链接已复制到剪贴板')
    }
  }

  return {
    // 状态
    loading,
    keyword,
    lastSavedContent,
    showPasswordDialog,

    // 计算属性
    hasUnsavedChanges,
    readOnlyLink,
    readOnlyUrl,

    // 方法
    fetchContent,
    saveContent,
    deleteContent,
    resetForm,
    handlePasswordVerified,
    createAutoSave,
    formatDate,
    copyReadOnlyLink
  }
}
