import { request } from './request'
import type { FileInfo } from '@/types'
import { uploadFile } from '@/utils/fileUploader'
import { handleError } from '@/utils/errorHandler'
import api from './index'

// Some Android in-app browsers (e.g. the DiLink system browser) ignore both
// the `download` attribute and the Content-Disposition header, so they save
// everything as "download.bin" derived from application/octet-stream. Fetching
// the bytes and handing the browser a blob URL keeps the real filename,
// because blob URLs always honour the anchor's `download` attribute.
// Above this size we fall back to a plain navigation to avoid ballooning memory.
const BLOB_DOWNLOAD_LIMIT = 64 * 1024 * 1024

function triggerAnchorDownload(href: string, fileName?: string, openInNewTab = false) {
  const link = document.createElement('a')
  link.href = href
  if (fileName) link.download = fileName
  if (openInNewTab) {
    link.target = '_blank'
    link.rel = 'noopener'
  }
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

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

  /**
   * Download a file.
   * Uses a blob URL so the saved filename is always the original one, which
   * fixes browsers that ignore Content-Disposition. Falls back to a direct
   * navigation when the file is large or the blob path is unavailable.
   */
  async download(fileName: string, fileSize = 0): Promise<void> {
    const url = `${api.getUrlPrefix()}/file/download?name=${encodeURIComponent(fileName)}`

    const canUseBlob =
      typeof fetch === 'function' &&
      typeof URL !== 'undefined' &&
      typeof URL.createObjectURL === 'function' &&
      (!fileSize || fileSize <= BLOB_DOWNLOAD_LIMIT)

    if (canUseBlob) {
      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`download failed: ${response.status}`)
        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)
        try {
          triggerAnchorDownload(objectUrl, fileName)
        } finally {
          // Revoke on the next tick so the click has been dispatched.
          setTimeout(() => URL.revokeObjectURL(objectUrl), 30000)
        }
        return
      } catch (error) {
        console.error('Blob download failed, falling back to direct link:', error)
      }
    }

    triggerAnchorDownload(url, fileName)
  },

  /** Open the file inline in a new tab (preview only, no save-as semantics). */
  openInNewTab(fileName: string): void {
    const url = `${api.getUrlPrefix()}/file/download?name=${encodeURIComponent(fileName)}`
    triggerAnchorDownload(url, undefined, true)
  },
}
