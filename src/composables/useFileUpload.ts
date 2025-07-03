/**
 * 文件上传管理 Composable - 重构版
 * 使用统一的 Store 管理状态，Composable 只负责业务逻辑
 */
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { fileApi } from '@/api/file'
import { configApi } from '@/api/config'
import { useAppStore } from '@/stores'
import type { UploadState } from '@/types'
import { handleError } from '@/utils/errorHandler'
import { calculateUploadStats, updateSpeedHistory } from '@/utils'
import { Constant } from '@/constant'

export function useFileUpload() {
  const appStore = useAppStore()

  /**
   * 获取上传配置
   */
  const fetchConfig = async () => {
    try {
      const config = await configApi.getUploadConfig()
      appStore.setUploadConfig(config)
    } catch (error) {
      console.error('获取配置失败:', error)
    }
  }

  /**
   * 获取文件列表
   */
  const fetchFileList = async () => {
    try {
      const files = await fileApi.list()
      appStore.setFileList(files || [])
    } catch (error) {
      console.error('获取文件列表失败:', error)
      appStore.setFileList([])
    }
  }

  /**
   * 上传文件
   */
  const uploadFile = async (file: File) => {
    // 检查上传条件
    if (!appStore.uploadFileCheck(file)) {
      ElMessage.error('无法上传：已达到文件数量或大小限制')
      return
    }

    // 创建取消控制器
    const controller = new AbortController()
    const startTime = Date.now()
    let lastUpdateTime = startTime

    // 创建上传状态（包含取消函数和速率统计字段）
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
      // 执行上传
      await fileApi.upload(
        file,
        (progress) => {
          const now = Date.now()
          const uploadedBytes = Math.round((progress / 100) * file.size)

          // 节流：最少间隔500ms更新一次速度统计
          const shouldUpdateStats = now - lastUpdateTime >= 500

          // 更新基本进度（每次都更新）
          appStore.updateUploadState(file.name, {
            progress,
            uploadedBytes,
          })

          // 更新速度统计（节流更新）
          if (shouldUpdateStats) {
            lastUpdateTime = now

            // 获取当前状态以更新速度历史
            const currentState = appStore.uploadStates.get(file.name)
            if (currentState && currentState.speedHistory) {
              // 更新速度历史记录
              const newSpeedHistory = updateSpeedHistory(
                currentState.speedHistory,
                now,
                uploadedBytes
              )

              // 计算平滑的速率和剩余时间
              const stats = calculateUploadStats(file.size, uploadedBytes, newSpeedHistory)

              // 更新状态
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

      // 上传成功
      appStore.updateUploadState(file.name, {
        status: 'completed',
        progress: 100,
        uploadedBytes: file.size,
        uploadSpeed: 0,
        remainingTime: 0,
      })

      ElMessage.success(Constant.MESSAGES.UPLOAD_SUCCESS)

      // 刷新文件列表
      await fetchFileList()

      // 立即清理上传状态
      appStore.removeUploadState(file.name)
    } catch (error) {
      // 检查是否是用户取消
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
        ElMessage.info(Constant.MESSAGES.UPLOAD_CANCELLED)
        return
      }

      // 上传失败
      const errorMessage = handleError(error)
      appStore.updateUploadState(file.name, {
        status: 'error',
        error: errorMessage,
        uploadSpeed: 0,
        remainingTime: 0,
      })
      ElMessage.error(Constant.MESSAGES.UPLOAD_FAILED)
    }
  }

  /**
   * 删除文件
   */
  const deleteFile = async (fileName: string) => {
    try {
      await fileApi.delete(fileName)
      ElMessage.success(Constant.MESSAGES.DELETE_SUCCESS)

      // 刷新文件列表
      await fetchFileList()
    } catch (error) {
      ElMessage.error(Constant.MESSAGES.DELETE_FAILED)
      throw error
    }
  }

  /**
   * 删除所有文件
   */
  const deleteAllFiles = async () => {
    try {
      const result = await fileApi.deleteAll()
      ElMessage.success(Constant.MESSAGES.DELETE_SUCCESS)

      // 清空文件列表
      appStore.setFileList([])
    } catch (error) {
      ElMessage.error(Constant.MESSAGES.DELETE_FAILED)
      throw error
    }
  }

  return {
    // 业务方法
    fetchConfig,
    fetchFileList,
    uploadFile,
    deleteFile,
    deleteAllFiles,
  }
}
