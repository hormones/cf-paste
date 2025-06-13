/**
 * 文件相关API
 */
import { request } from './request'
import type { FileInfo } from '@/types'
import { FILE_UPLOAD_LIMITS } from '@/types'
import { Utils } from '@/utils'
import Cookies from 'js-cookie'
import { useWordStore } from '@/stores'

export const fileApi = {
  /**
   * 获取文件列表
   */
  getFileList() {
    return request.get<FileInfo[]>('/file/list')
  },

  /**
   * 验证文件上传限制
   * @param file 待上传的文件
   * @param currentFiles 当前已有文件列表
   * @returns {string | null} 错误信息，如果通过验证则返回 null
   */
  validateFileUpload(file: File, currentFiles: FileInfo[] = []): string | null {
    // 检查文件数量限制
    if (currentFiles.length >= FILE_UPLOAD_LIMITS.MAX_FILES) {
      return `最多只能上传${FILE_UPLOAD_LIMITS.MAX_FILES}个文件`
    }

    // 计算当前总大小
    const currentTotalSize = currentFiles.reduce((sum, file) => sum + file.size, 0)

    // 检查总大小限制
    if (currentTotalSize + file.size > FILE_UPLOAD_LIMITS.MAX_TOTAL_SIZE) {
      return `文件总大小不能超过${Utils.humanReadableSize(FILE_UPLOAD_LIMITS.MAX_TOTAL_SIZE)}`
    }

    return null
  },

  /**
   * 上传文件
   * @param file 文件对象
   * @param onProgress 上传进度回调
   */
  // 上传文件限制：https://developers.cloudflare.com/workers/platform/limits/#request-limits
  uploadFile(file: File, onProgress?: (progress: number) => void) {
    // 添加文件类型验证
    const error = this.validateFileUpload(file)
    if (error) {
      return Promise.reject(new Error(error))
    }

    return request.post(`/file/${file.name}`, file, {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      transformResponse: [(data) => data],
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100
          onProgress(Math.round(progress))
        }
      },
      timeout: 30 * 60 * 1000,
      added: {
        skipResponseTransform: true,
      },
    })
  },

  /**
   * 下载文件
   * @param fileName 文件名
   */
  // 获取文件限制：https://developers.cloudflare.com/workers/platform/limits/#response-limits
  downloadFile(fileName: string) {
    // 设置 word 到 cookie，这样下载请求会带上
    // Cookies.set('word', useWordStore().word)
    // 直接返回下载 URL
    return Promise.resolve(`/api/file/download?name=${fileName}`)
  },

  /**
   * 删除文件
   * @param fileName 文件名
   */
  deleteFile(fileName: string) {
    return request.delete(`/file/${fileName}`)
  },
}
