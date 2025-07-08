import { ElMessage } from 'element-plus'
import { dataApi } from '@/api/data'
import { useAppStore } from '@/stores'
import type { Keyword } from '@/types'
import { Constant } from '@/constant'

export function useMain() {
  const appStore = useAppStore()

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

  // Handle fetch errors with appropriate UI feedback
  const handleFetchError = (response: any) => {
    if (response?.status === 401) {
      appStore.setShowPasswordDialog(true)
    } else {
      console.error(response)
      ElMessage.error(response?.msg || response?.error || Constant.MESSAGES.FETCH_FAILED)
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
        appStore.updateKeywordFields({
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

  const copyReadOnlyLink = async () => {
    try {
      const fullUrl = `${window.location.origin}${appStore.readOnlyUrl}`
      await navigator.clipboard.writeText(fullUrl)
      ElMessage.success('Link copied to clipboard')
    } catch (error) {
      // Fallback: use traditional copy method
      const textArea = document.createElement('textarea')
      textArea.value = `${window.location.origin}${appStore.readOnlyUrl}`
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      ElMessage.success('Link copied to clipboard')
    }
  }

  const resetViewWord = async () => {
    appStore.setLoading(true)
    try {
      const response = await dataApi.resetViewWord()
      if (response.view_word) {
        appStore.updateKeywordFields({ view_word: response.view_word })
        ElMessage.success('Read-only link updated')
      }
    } catch (error) {
      ElMessage.error('Reset failed, please try again later')
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
