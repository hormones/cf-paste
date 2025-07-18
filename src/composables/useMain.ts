import { ElMessage } from 'element-plus'
import { dataApi } from '@/api/data'
import { useAppStore } from '@/stores'
import { useI18n } from './useI18n'

export function useMain() {
  const appStore = useAppStore()
  const { t } = useI18n()

  const fetchKeyword = async () => {
    appStore.setLoading(true)
    try {
      const data = await dataApi.getKeyword()
      if (data) {
        appStore.setKeyword(data)
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

  // Handle fetch errors with appropriate UI feedback
  const handleFetchError = (response: any) => {
    if (response?.status === 401) {
      appStore.setShowPasswordDialog(true)
    } else {
      ElMessage.error(response?.msg || response?.error || t('errors.contentNotFound'))
    }
  }

  const saveKeyword = async (silent = false) => {
    appStore.setLoading(true)
    try {
      const currentTime = Date.now()

      if (appStore.keyword.id) {
        // Update existing record
        const data: Partial<Keyword> = {
          content: appStore.keyword.content,
        }
        await dataApi.updateKeyword(data)

        // Update frontend update_time
        appStore.updateKeyword({
          update_time: currentTime,
        })
      } else {
        // Create new record
        const data: Keyword = {
          word: appStore.keyword.word,
          view_word: appStore.keyword.view_word,
          content: appStore.keyword.content,
          expire_time: appStore.keyword.expire_time,
        }
        const id = await dataApi.createKeyword(data)

        // Update frontend time fields after successful creation
        appStore.updateKeyword({
          id,
          create_time: currentTime,
          update_time: currentTime,
        })
      }

      appStore.setLastSavedContent(appStore.keyword.content || '')

      if (!silent) {
        ElMessage.success(t('common.msg.saveSuccess'))
      }
    } catch (error) {
      ElMessage.error(t('common.msg.saveFailed'))
      throw error
    } finally {
      appStore.setLoading(false)
    }
  }

  const deleteKeyword = async () => {
    try {
      await dataApi.deleteKeyword()
      appStore.resetKeyword()
      ElMessage.success(t('common.msg.deleteSuccess'))
    } catch (error) {
      ElMessage.error(t('common.msg.deleteFailed'))
      throw error
    }
  }

  const copyReadOnlyLink = async () => {
    try {
      await navigator.clipboard.writeText(appStore.readOnlyLink)
      ElMessage.success(t('clipboard.linkCopied'))
    } catch (error) {
      // Fallback: use traditional copy method
      const textArea = document.createElement('textarea')
      textArea.value = appStore.readOnlyLink
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      ElMessage.success(t('clipboard.linkCopied'))
    }
  }

  const resetViewWord = async () => {
    appStore.setLoading(true)
    try {
      const response = await dataApi.resetViewWord()
      if (response.view_word) {
        appStore.updateKeyword({ view_word: response.view_word })
        ElMessage.success(t('clipboard.linkUpdated'))
      }
    } catch (error) {
      ElMessage.error(t('common.msg.saveFailed'))
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
