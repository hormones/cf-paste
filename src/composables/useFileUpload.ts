import { ElMessage } from 'element-plus'
import { fileApi } from '@/api/file'
import { passApi } from '@/api/pass'
import { useAppStore } from '@/stores'
import type { UploadState } from '@/types'
import { handleError } from '@/utils/errorHandler'
import { calculateUploadStats, updateSpeedHistory } from '@/utils'
import { Constant } from '@/constant'
import { useI18nComposable } from './useI18n'

export function useFileUpload() {
  const appStore = useAppStore()
  const { t } = useI18nComposable()

  const fetchConfig = async () => {
    try {
      const config = await passApi.getPasteConfig()
      appStore.setPasteConfig(config)
    } catch (error) {
      console.error('Failed to fetch config:', error)
    }
  }

  const fetchFileList = async () => {
    try {
      const files = await fileApi.list()
      appStore.setFileList(files || [])
    } catch (error) {
      console.error('Failed to fetch file list:', error)
      appStore.setFileList([])
    }
  }

  // Core upload function with progress tracking and rate limiting
  const uploadFile = async (file: File) => {
    // Check upload conditions
    if (!appStore.uploadFileCheck(file)) {
      ElMessage.error('Cannot upload: file count or size limit reached')
      return
    }

    // Create cancellation controller
    const controller = new AbortController()
    const startTime = Date.now()
    let lastUpdateTime = startTime

    // Create upload state with cancellation function and rate statistics
    const uploadState: UploadState = {
      currentFile: file,
      progress: 0,
      status: 'uploading',
      error: null,
      cancel: () => controller.abort(),
      startTime,
      uploadedBytes: 0,
      uploadSpeed: 0,
      remainingTime: 0,
      speedHistory: [{ timestamp: startTime, uploadedBytes: 0 }],
    }
    appStore.addUploadState(file.name, uploadState)

    try {
      // Execute upload
      await fileApi.upload(
        file,
        (progress) => {
          const now = Date.now()
          const uploadedBytes = Math.round((progress / 100) * file.size)

          // Throttling: update speed statistics at minimum 500ms intervals
          const shouldUpdateStats = now - lastUpdateTime >= 500

          // Update basic progress (every time)
          appStore.updateUploadState(file.name, {
            progress,
            uploadedBytes,
          })

          // Update speed statistics (throttled)
          if (shouldUpdateStats) {
            lastUpdateTime = now

            // Get current state to update speed history
            const currentState = appStore.uploadStates.get(file.name)
            if (currentState && currentState.speedHistory) {
              // Update speed history
              const newSpeedHistory = updateSpeedHistory(
                currentState.speedHistory,
                now,
                uploadedBytes
              )

              // Calculate smooth rate and remaining time
              const stats = calculateUploadStats(file.size, uploadedBytes, newSpeedHistory)

              // Update state
              appStore.updateUploadState(file.name, {
                speedHistory: newSpeedHistory,
                uploadSpeed: stats.uploadSpeed,
                remainingTime: stats.remainingTime,
              })
            }
          }
        },
        controller.signal
      )

      // Upload successful
      appStore.updateUploadState(file.name, {
        status: 'completed',
        progress: 100,
        uploadedBytes: file.size,
        uploadSpeed: 0,
        remainingTime: 0,
      })

      ElMessage.success(t('messages.uploadSuccess'))

      // Refresh file list
      await fetchFileList()

      // Immediately clean up upload state
      appStore.removeUploadState(file.name)
    } catch (error) {
      // Check if user cancelled
      if (
        error instanceof Error &&
        (error.name === 'AbortError' ||
          error.name === 'CanceledError' ||
          error.message.includes('aborted') ||
          error.message.includes('cancelled') ||
          error.message.includes('canceled') ||
          (error as any).code === 'ERR_CANCELED')
      ) {
        appStore.removeUploadState(file.name)
        ElMessage.info(t('messages.uploadCancelled'))
        return
      }

      // Upload failed
      const errorMessage = handleError(error)
      appStore.updateUploadState(file.name, {
        status: 'error',
        error: errorMessage,
        uploadSpeed: 0,
        remainingTime: 0,
      })
      ElMessage.error(t('messages.uploadFailed'))
    }
  }

  const deleteFile = async (fileName: string) => {
    try {
      await fileApi.delete(fileName)
      ElMessage.success(t('messages.deleteSuccess'))

      // Refresh file list
      await fetchFileList()
    } catch (error) {
      ElMessage.error(t('messages.deleteFailed'))
      throw error
    }
  }

  const deleteAllFiles = async () => {
    try {
      const result = await fileApi.deleteAll()
      ElMessage.success(t('messages.deleteSuccess'))

      // Clear file list
      appStore.setFileList([])
    } catch (error) {
      ElMessage.error(t('messages.deleteFailed'))
      throw error
    }
  }

  return {
    // Business methods
    fetchConfig,
    fetchFileList,
    uploadFile,
    deleteFile,
    deleteAllFiles,
  }
}
