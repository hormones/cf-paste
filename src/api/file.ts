/**
 * 文件相关API
 */
import { request } from './request'
import type { FileInfo } from '@/types'

export const fileApi = {
  /**
   * 获取文件列表
   */
  getFileList() {
    return request.get<FileInfo[]>('/file/list')
  },

  /**
   * 上传文件
   * @param file 文件对象
   * @param onProgress 上传进度回调
   */
  uploadFile(file: File, onProgress?: (progress: number) => void) {
    const formData = new FormData()
    formData.append('file', file)

    return request.post(`/file/${file.name}`, formData, {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100
          onProgress(Math.round(progress))
        }
      },
    })
  },

  /**
   * 下载文件
   * @param fileName 文件名
   */
  downloadFile(fileName: string) {
    return request.get(`/file/${fileName}`, {
      responseType: 'blob',
    })
  },

  /**
   * 删除文件
   * @param fileName 文件名
   */
  deleteFile(fileName: string) {
    return request.delete(`/file/${fileName}`)
  },
}
