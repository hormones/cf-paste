import { request } from './request'
import type { FileInfo } from '@/types'
import { uploadFile } from '@/utils/fileUploader'
import { handleError } from '@/utils/errorHandler'
import api from './index'

export const fileApi = {
  async list(): Promise<FileInfo[]> {
    return request.get<FileInfo[]>('/file/list')
  },

  // Automatically selects optimal strategy (direct or chunked upload)
  async upload(
    file: File,
    onProgress?: (percentage: number) => void,
    signal?: AbortSignal
  ): Promise<void> {
    try {
      await uploadFile(file, onProgress, signal)
    } catch (error) {
      // If it's a cancellation error, throw original error without wrapping
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
      // Wrap other errors
      throw new Error(handleError(error))
    }
  },

  async delete(fileName: string): Promise<void> {
    return request.delete('/file', { params: { name: fileName } })
  },

  async deleteAll(): Promise<{ deletedCount: number; message: string }> {
    return request.delete('/file/all')
  },

  download(fileName: string): void {
    const url = `${api.getUrlPrefix()}/file/download?name=${encodeURIComponent(fileName)}`
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  },
}
