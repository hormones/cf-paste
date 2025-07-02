/**
 * 极简文件上传器
 * 利用现有 axios 架构，两个函数解决一切
 */
import { request } from '@/api/request'
import { useAppStore } from '@/stores'
import { handleError } from './errorHandler'
import type { UploadConfig } from '@/types'

/**
 * 主上传函数 - 自动选择上传策略
 * @param file 要上传的文件
 * @param onProgress 进度回调函数 (percentage: 0-100)
 * @param signal 取消信号
 */
export async function uploadFile(
  file: File,
  onProgress?: (percentage: number) => void,
  signal?: AbortSignal
): Promise<void> {
  try {
    const appStore = useAppStore()
    const config = appStore.uploadConfig

    if (!config) {
      throw new Error('上传配置不可用。应用初始化可能失败。')
    }

    // 根据文件大小自动选择上传策略
    if (file.size > config.chunkThreshold && config.chunkSize > 0) {
      return await uploadChunked(file, config, onProgress, signal)
    } else {
      return await uploadDirect(file, onProgress, signal)
    }
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
}

/**
 * 直传上传 - 利用专用的文件上传方法
 */
async function uploadDirect(
  file: File,
  onProgress?: (percentage: number) => void,
  signal?: AbortSignal
): Promise<void> {
  await request.uploadFile(`/file/${file.name}`, file, {
    onProgress,
    signal,
  })
}

/**
 * 分片上传 - 利用 axios 架构，支持进度监控和取消
 */
async function uploadChunked(
  file: File,
  config: UploadConfig,
  onProgress?: (percentage: number) => void,
  signal?: AbortSignal
): Promise<void> {
  let uploadId = ''
  let fileKey = ''

  try {
    // 1. 初始化分片上传
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
    fileKey = key // 使用服务端返回的完整fileKey路径
    const parts: Array<{ partNumber: number; etag: string }> = []

    // 2. 顺序上传分片（利用 axios 进度监控）
    for (let i = 0; i < totalChunks; i++) {
      // 在每个分片开始前检查是否已被取消
      if (signal?.aborted) {
        throw new Error('Upload cancelled by user')
      }

      const start = i * config.chunkSize
      const end = Math.min(start + config.chunkSize, file.size)
      const chunk = file.slice(start, end)

      // 上传单个分片，利用专用的文件上传方法
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
                // 计算总体进度：已完成分片 + 当前分片进度
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

    // 3. 完成分片上传
    await request.post(
      `/file/multipart/complete/${uploadId}`,
      {
        fileKey: fileKey, // 使用完整的fileKey路径，而不是file.name
        parts,
      },
      { signal }
    )

    // 确保进度达到100%
    if (onProgress) {
      onProgress(100)
    }
  } catch (error) {
    // 清理失败的上传
    if (uploadId && fileKey) {
      try {
        await request.delete(`/file/multipart/cancel/${uploadId}`, {
          data: { fileKey: fileKey }, // 使用完整的fileKey路径，而不是file.name
        })
      } catch (cleanupError) {
        // 清理失败也不影响错误抛出
        console.warn('清理失败的上传时出错:', cleanupError)
      }
    }
    throw error // 直接抛出原始错误，让上层统一处理
  }
}
