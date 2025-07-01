/**
 * 文件上传管理 Composable
 * 负责文件上传、进度管理、验证等功能
 */
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { fileApi } from '@/api/file'
import { useUploadConfig } from './useUploadConfig'
import type { FileInfo } from '@/types'
import type { UploadProgress } from '@/utils/chunkUploader'
import { Utils } from '@/utils'
import { Constant } from '@/constant'

export interface UploadState {
  /** 当前上传的文件 */
  currentFile: File | null
  /** 上传进度信息 */
  progress: UploadProgress | null
  /** 上传状态 */
  status: 'idle' | 'uploading' | 'completed' | 'error'
  /** 错误信息 */
  error: string | null
  /** 是否可以取消 */
  canCancel: boolean
  /** 上传器实例，用于取消等操作 */
  uploader?: { abort: () => void }
}

export function useFileUpload() {
  const { uploadConfig, fetchConfig, maxFiles, maxTotalSize } = useUploadConfig()

  // 文件状态
  const fileList = ref<FileInfo[]>([])
  const uploadLoading = ref(false)

  // 上传状态管理
  const uploadStates = ref(new Map<string, UploadState>())

  /**
   * 获取文件列表
   */
  const fetchFileList = async () => {
    try {
      const files = await fileApi.getFileList()
      fileList.value = files || []
      return files
    } catch (error) {
      console.error('获取文件列表失败:', error)
      return []
    }
  }

  /**
   * 验证文件上传
   */
  const validateFile = async (file: File): Promise<string | null> => {
    const config = await fetchConfig()
    return fileApi.validateFileUpload(file, fileList.value, config)
  }

  /**
   * 上传单个文件
   */
  const uploadFile = async (file: File): Promise<void> => {
    uploadLoading.value = true

    try {
      // 先验证文件，只有通过验证才创建上传状态
      const validationError = await validateFile(file)
      if (validationError) {
        throw new Error(validationError)
      }

      // 验证通过后才初始化上传状态
      const uploadState: UploadState = {
        currentFile: file,
        progress: null,
        status: 'uploading',
        error: null,
        canCancel: true
      }
      uploadStates.value.set(file.name, uploadState)

      // 开始上传
      await fileApi.uploadFile(file, {
        onReady: (uploader) => {
          const state = uploadStates.value.get(file.name)
          if (state) {
            state.uploader = uploader
          }
        },
        onProgress: (progress: UploadProgress) => {
          const state = uploadStates.value.get(file.name)
          if (state) {
            state.progress = progress
            state.status = 'uploading'
          }
        },
        onComplete: () => {
          const state = uploadStates.value.get(file.name)
          if (state) {
            state.status = 'completed'
            state.canCancel = false
            // 成功完成后立即清理状态
            uploadStates.value.delete(file.name)
          }
        },
        onError: (error: string) => {
          const state = uploadStates.value.get(file.name)
          if (state) {
            state.status = 'error'
            state.error = error
            state.canCancel = false
          }
        }
      })

      ElMessage.success(Constant.MESSAGES.UPLOAD_SUCCESS)

      // 更新文件列表
      await fetchFileList()

    } catch (error) {
      const state = uploadStates.value.get(file.name)
      if (state) {
        // 只有在已创建上传状态的情况下才更新状态
        state.status = 'error'
        state.error = error instanceof Error ? error.message : '上传失败'
        state.canCancel = false

        // 如果是用户取消，则不显示错误信息，并直接清理状态
        if (error instanceof Error && (error.name === 'CanceledError' || error.name === 'AbortError' || error.message === '上传已取消')) {
          if (state) {
            uploadStates.value.delete(file.name)
          }
          ElMessage.info('上传已取消')
          return // 提前返回，避免显示多余的 ElMessage.error
        }

        // 如果有 state，则在短暂延迟后清理状态
        if (state) {
          setTimeout(() => {
            uploadStates.value.delete(file.name)
          }, 5000) // 错误状态保持稍长时间让用户看到错误信息
        }
      }

      ElMessage.error(error instanceof Error ? error.message : Constant.MESSAGES.UPLOAD_FAILED)
      throw error
    } finally {
      uploadLoading.value = false
    }
  }

  /**
   * 取消上传
   */
  const cancelUpload = async (fileName: string) => {
    const state = uploadStates.value.get(fileName)
    if (state && state.canCancel && state.uploader) {
      try {
        await state.uploader.abort()
      } catch (error) {
        console.warn('取消上传时出错:', error)
      }
    }
  }

  /**
   * 删除文件
   */
  const deleteFile = async (fileName: string) => {
    try {
      await fileApi.deleteFile(fileName)
      ElMessage.success(Constant.MESSAGES.DELETE_SUCCESS)
      await fetchFileList()
    } catch (error) {
      ElMessage.error(Constant.MESSAGES.DELETE_FAILED)
      throw error
    }
  }

  /**
   * 下载文件
   */
  const downloadFile = async (fileName: string) => {
    try {
      const response = await fetch(`/api/file/download?name=${encodeURIComponent(fileName)}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/octet-stream',
        },
      })

      if (!response.ok) {
        throw new Error('下载失败')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.style.display = 'none'

      document.body.appendChild(a)
      a.click()

      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '下载失败')
      throw error
    }
  }

  // 计算属性
  const remainingUploadSpace = computed(() => {
    const currentSize = fileList.value.reduce((sum, file) => sum + file.size, 0)
    return maxTotalSize.value - currentSize
  })

  const usedSpace = computed(() => maxTotalSize.value - remainingUploadSpace.value)

  const canUpload = computed(() =>
    !uploadLoading.value &&
    fileList.value.length < maxFiles.value &&
    remainingUploadSpace.value > 0
  )

  const fileTabLabel = computed(() => `文件(${fileList.value.length}个)`)

    return {
    // 状态
    fileList,
    uploadLoading,
    uploadStates: computed(() => uploadStates.value),

    // 计算属性
    remainingUploadSpace,
    usedSpace,
    canUpload,
    fileTabLabel,

    // 方法
    fetchFileList,
    validateFile,
    uploadFile,
    cancelUpload,
    deleteFile,
    downloadFile
  }
}
