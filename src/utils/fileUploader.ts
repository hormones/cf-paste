/**
 * Minimal file uploader
 * Uses existing axios architecture, two functions solve everything
 */
import { request } from '@/api/request'
import { useAppStore } from '@/stores'
import { handleError } from './errorHandler'
import type { PasteConfig } from '@/types'

/**
 * Main upload function - automatically selects upload strategy
 * @param file File to upload
 * @param onProgress Progress callback function (percentage: 0-100)
 * @param signal Cancellation signal
 */
export async function uploadFile(
  file: File,
  onProgress?: (percentage: number) => void,
  signal?: AbortSignal
): Promise<void> {
  try {
    const appStore = useAppStore()
    const config = appStore.pasteConfig

    if (!config) {
      throw new Error('Upload configuration unavailable. Application initialization may have failed.')
    }

    // Automatically select upload strategy based on file size
    if (file.size > config.chunkThreshold && config.chunkSize > 0) {
      return await uploadChunked(file, config, onProgress, signal)
    } else {
      return await uploadDirect(file, onProgress, signal)
    }
  } catch (error) {
    // If it's a cancellation error, throw original error directly without wrapping
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
}

/**
 * Direct upload - uses dedicated file upload method
 */
async function uploadDirect(
  file: File,
  onProgress?: (percentage: number) => void,
  signal?: AbortSignal
): Promise<void> {
  await request.uploadFile(`/file?name=${encodeURIComponent(file.name)}`, file, {
    onProgress,
    signal,
  })
}

/**
 * Chunked upload - uses axios architecture, supports progress monitoring and cancellation
 */
async function uploadChunked(
  file: File,
  config: PasteConfig,
  onProgress?: (percentage: number) => void,
  signal?: AbortSignal
): Promise<void> {
  let uploadId = ''
  let fileKey = ''

  try {
    // 1. Initialize chunked upload
    const init = await request.post(
      '/file/multipart/init',
      {
        filename: file.name,
        fileSize: file.size,
        chunkSize: config.chunkSize,
      },
      { signal }
    )

    const { uploadId: id, totalChunks, fileKey: key } = init
    uploadId = id
    fileKey = key // Use complete fileKey path returned by server
    const parts: Array<{ partNumber: number; etag: string }> = []

    // 2. Upload chunks sequentially (using axios progress monitoring)
    for (let i = 0; i < totalChunks; i++) {
      // Check if cancelled before each chunk starts
      if (signal?.aborted) {
        throw new Error('Upload cancelled by user')
      }

      const start = i * config.chunkSize
      const end = Math.min(start + config.chunkSize, file.size)
      const chunk = file.slice(start, end)

      // Upload single chunk using dedicated file upload method
      const chunkResult = await request.uploadFile(
        `/file/multipart/chunk/${uploadId}/${i}`,
        chunk,
        {
          headers: {
            'X-File-Key': encodeURIComponent(fileKey),
          },
          signal,
          onProgress: onProgress
            ? (chunkProgress) => {
                // Calculate overall progress: completed chunks + current chunk progress
                const completedProgress = (i / totalChunks) * 100
                const currentChunkProgress = (chunkProgress / 100) * (100 / totalChunks)
                const totalProgress = Math.round(completedProgress + currentChunkProgress)
                onProgress(Math.min(totalProgress, 100))
              }
            : undefined,
        }
      )

      parts.push({
        partNumber: i + 1,
        etag: chunkResult.etag,
      })
    }

    // 3. Complete chunked upload
    await request.post(
      `/file/multipart/complete/${uploadId}`,
      {
        fileKey: fileKey, // Use complete fileKey path instead of file.name
        parts,
      },
      { signal }
    )

    // Ensure progress reaches 100%
    if (onProgress) {
      onProgress(100)
    }
  } catch (error) {
    // Clean up failed upload
    if (uploadId && fileKey) {
      try {
        // Fire-and-forget cleanup request, let it execute in background
        request.delete(`/file/multipart/cancel/${uploadId}`, {
          data: { fileKey: fileKey }, // Use complete fileKey path instead of file.name
        })
      } catch (cleanupError) {
        // Cleanup failure doesn't affect error throwing
        console.warn('Error during cleanup of failed upload:', cleanupError)
      }
    }
    throw error // Throw original error directly, let upper layer handle uniformly
  }
}
