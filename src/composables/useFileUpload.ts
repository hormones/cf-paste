/**
 * 文件上传管理 Composable - 重构版
 * 使用统一的 Store 管理状态，Composable 只负责业务逻辑
 */
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { fileApi } from '@/api/file'
import { configApi } from '@/api/config'
import { useAppStore } from '@/stores'
import type { FileInfo, UploadState } from '@/types'
import { handleError } from '@/utils/errorHandler'

export function useFileUpload() {
  const appStore = useAppStore()

  /**
   * 获取上传配置
   */
  const fetchConfig = async () => {
    try {
      const config = await configApi.getUploadConfig()
      appStore.setUploadConfig({
        maxFiles: config.maxFiles || 10,
        maxTotalSize: config.maxTotalSize || 100 * 1024 * 1024
      })
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
    if (!appStore.canUpload) {
      ElMessage.error('无法上传：已达到文件数量或大小限制')
      return
    }

    // 创建取消控制器
    const controller = new AbortController()

    // 创建上传状态（包含取消函数）
    const uploadState: UploadState = {
      currentFile: file,
      progress: 0,
      status: 'uploading',
      error: null,
      cancel: () => controller.abort()
    }
    appStore.addUploadState(file.name, uploadState)

    try {
      // 执行上传
      await fileApi.upload(file, (progress) => {
        appStore.updateUploadState(file.name, { progress })
      }, controller.signal)

      // 上传成功
      appStore.updateUploadState(file.name, {
        status: 'completed',
        progress: 100
      })

      ElMessage.success(`文件 ${file.name} 上传成功`)

      // 刷新文件列表
      await fetchFileList()

      // 立即清理上传状态
      appStore.removeUploadState(file.name)

    } catch (error) {
            // 检查是否是用户取消
      if (error instanceof Error && (
        error.name === 'AbortError' ||
        error.name === 'CanceledError' ||
        error.message.includes('aborted') ||
        error.message.includes('cancelled') ||
        error.message.includes('canceled') ||
        (error as any).code === 'ERR_CANCELED'
      )) {
        appStore.removeUploadState(file.name)
        ElMessage.info(`文件 ${file.name} 上传已取消`)
        return
      }

      // 上传失败
      const errorMessage = handleError(error)
      appStore.updateUploadState(file.name, {
        status: 'error',
        error: errorMessage
      })
      ElMessage.error(`文件 ${file.name} 上传失败: ${errorMessage}`)
    }
  }

  /**
   * 批量上传文件
   */
  const uploadFiles = async (files: File[]) => {
    const validFiles = files.filter(file => {
      if (appStore.fileList.length + appStore.uploadStates.size >= appStore.maxFiles) {
        ElMessage.error(`文件 ${file.name} 跳过：已达到最大文件数量限制`)
        return false
      }
      return true
    })

    // 并发上传
    const uploadPromises = validFiles.map(file => uploadFile(file))
    await Promise.allSettled(uploadPromises)
  }

  /**
   * 删除文件
   */
  const deleteFile = async (fileName: string) => {
    try {
      await fileApi.delete(fileName)
      ElMessage.success(`文件 ${fileName} 删除成功`)

      // 刷新文件列表
      await fetchFileList()
    } catch (error) {
      const errorMessage = handleError(error)
      ElMessage.error(`删除文件失败: ${errorMessage}`)
      throw error
    }
  }

  /**
   * 删除所有文件
   */
  const deleteAllFiles = async () => {
    try {
      const result = await fileApi.deleteAll()
      ElMessage.success(result.message || '所有文件删除成功')

      // 刷新文件列表
      await fetchFileList()
    } catch (error) {
      const errorMessage = handleError(error)
      ElMessage.error(`删除所有文件失败: ${errorMessage}`)
      throw error
    }
  }

  /**
   * 下载文件
   */
  const downloadFile = (fileName: string) => {
    try {
      fileApi.download(fileName)
    } catch (error) {
      const errorMessage = handleError(error)
      ElMessage.error(`下载文件失败: ${errorMessage}`)
    }
  }

  /**
   * 移除上传状态
   */
  const removeUploadState = (fileName: string) => {
    appStore.removeUploadState(fileName)
  }

  /**
   * 清除所有上传状态
   */
  const clearUploadStates = () => {
    appStore.clearUploadStates()
  }

  return {
    // 状态 (来自 Store)
    fileList: computed(() => appStore.fileList),
    uploadStates: computed(() => appStore.uploadStates),

    // 配置 (来自 Store)
    maxFiles: computed(() => appStore.maxFiles),
    maxTotalSize: computed(() => appStore.maxTotalSize),

    // 计算属性 (来自 Store)
    fileTabLabel: computed(() => appStore.fileTabLabel),
    usedSpace: computed(() => appStore.usedSpace),
    canUpload: computed(() => appStore.canUpload),

    // 业务方法
    fetchConfig,
    fetchFileList,
    uploadFile,
    uploadFiles,
    deleteFile,
    deleteAllFiles,
    downloadFile,
    removeUploadState,
    clearUploadStates,
  }
}
