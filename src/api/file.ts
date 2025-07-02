/**
 * 文件相关API - 极简版
 * 利用新的统一上传架构
 */
import { request } from './request'
import type { FileInfo } from '@/types'
import { uploadFile } from '@/utils/fileUploader'
import { handleError } from '@/utils/errorHandler'

export const fileApi = {
  /**
   * 获取文件列表
   */
  async list(): Promise<FileInfo[]> {
    return request.get<FileInfo[]>('/file/list')
  },

  /**
   * 上传文件 - 自动选择最佳策略（直传或分片）
   * @param file 要上传的文件
   * @param onProgress 进度回调函数
   * @param signal 取消信号
   * @returns 上传Promise
   */
  async upload(
    file: File,
    onProgress?: (percentage: number) => void,
    signal?: AbortSignal
  ): Promise<void> {
    try {
      await uploadFile(file, onProgress, signal)
    } catch (error) {
      // 如果是取消错误，直接抛出原始错误，不要包装
      if (
        error instanceof Error &&
        (error.name === 'AbortError' ||
          error.name === 'CanceledError' ||
          error.message.includes('aborted') ||
          error.message.includes('cancelled') ||
          error.message.includes('canceled') ||
          (error as any).code === 'ERR_CANCELED')
      ) {
        throw error
      }
      // 其他错误才进行包装
      throw new Error(handleError(error))
    }
  },

  /**
   * 删除文件
   */
  async delete(fileName: string): Promise<void> {
    return request.delete(`/file/${fileName}`)
  },

  /**
   * 删除所有文件
   */
  async deleteAll(): Promise<{ deletedCount: number; message: string }> {
    return request.delete('/file/all')
  },

  /**
   * 下载文件
   */
  download(fileName: string): void {
    const link = document.createElement('a')
    link.href = `/file/download/${encodeURIComponent(fileName)}`
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  },
}

/**
 * 下载文件 - 浏览器原生下载
 * @param fileName 文件名
 * @param token 可选的下载会话Token（仅浏览者模式需要）
 */
export function downloadFile(fileName: string, token?: string) {
  // 1. 构造下载URL
  // API的基础路径已经在axios实例中设置，这里我们直接用相对路径
  let url = '/api/file/download/'
  if (token) {
    url += `pass/${token}/${encodeURIComponent(fileName)}`
  } else {
    url += encodeURIComponent(fileName)
  }

  // 2. 创建一个隐藏的 a 标签
  const link = document.createElement('a')
  link.href = url

  // 3. 设置 download 属性，这会告诉浏览器下载文件而不是导航
  link.download = fileName

  // 4. 将 a 标签添加到文档中，模拟点击，然后移除
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
