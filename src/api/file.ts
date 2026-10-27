import { request } from './request'
import type { FileInfo } from '@/types'
import { uploadFile } from '@/utils/fileUploader'
import { handleError } from '@/utils/errorHandler'
import api from './index'

/** Build the download endpoint URL; `preview` selects the inline disposition. */
function buildDownloadUrl(fileName: string, preview = false): string {
  const query = `name=${encodeURIComponent(fileName)}`
  return `${api.getUrlPrefix()}/file/download?${query}${preview ? '&preview=true' : ''}`
}

/**
 * Start a same-origin top-level navigation and let the browser's download
 * manager own the response.
 *
 * The endpoint answers with `Content-Disposition: attachment`, so the browser
 * creates the download entry as soon as the response headers arrive and writes
 * the body to disk while it streams. Fetching the bytes first and handing the
 * result to a blob URL instead buffers the entire file in page memory before
 * the save dialog appears, which loses streaming and the progress indicator.
 *
 * The `download` attribute is only a fallback: the HTML spec gives the
 * server-provided `Content-Disposition` filename precedence over it.
 */
function triggerNavigation(href: string, fileName?: string, openInNewTab = false): void {
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

  /** Download a file through the browser's own download manager. */
  download(fileName: string): void {
    triggerNavigation(buildDownloadUrl(fileName), fileName)
  },

  /** Open the file inline in a new tab (preview only, no save-as semantics). */
  openInNewTab(fileName: string): void {
    triggerNavigation(buildDownloadUrl(fileName, true), undefined, true)
  },
}
