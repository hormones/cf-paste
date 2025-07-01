/**
 * 文件相关API
 */
import { request } from './request'
import type { FileInfo, UploadConfig } from '@/types'
import { configApi } from './config'
import { ChunkUploader, type ChunkUploadApi, type ChunkUploadCallbacks } from '@/utils/chunkUploader'
import { Utils } from '@/utils'
import Cookies from 'js-cookie'
import { useWordStore } from '@/stores'

/** 分片上传初始化响应 */
interface InitChunkedUploadResponse {
  uploadId: string
  fileKey: string
  totalChunks: number
}

/** 分片上传响应 */
interface UploadChunkResponse {
  partNumber: number
  etag: string
}

/** 完成分片上传响应 */
interface CompleteChunkedUploadResponse {
  fileKey: string
  etag: string
  size: number
}

/**
 * 普通上传进度跟踪器
 */
class DirectUploadProgressTracker {
  private startTime: number = 0
  private lastTime: number = 0
  private lastLoaded: number = 0
  private fileSize: number = 0
  private currentSpeed: number = 0
  private speedHistory: number[] = []
  private readonly maxSpeedHistorySize = 5

  constructor(fileSize: number) {
    this.fileSize = fileSize
    this.startTime = Date.now()
    this.lastTime = this.startTime
    this.lastLoaded = 0
  }

  /**
   * 计算上传进度信息
   */
  calculateProgress(percentage: number) {
    const now = Date.now()
    const loaded = (percentage / 100) * this.fileSize

    // 计算时间差和字节差
    const timeDiff = (now - this.lastTime) / 1000
    const bytesDiff = loaded - this.lastLoaded

    // 更新速度计算
    if (timeDiff > 0.05) { // 降低到50ms间隔，提高更新频率
      // 计算瞬时速度
      const instantSpeed = bytesDiff / timeDiff

      // 将速度添加到历史记录
      this.speedHistory.push(instantSpeed)
      if (this.speedHistory.length > this.maxSpeedHistorySize) {
        this.speedHistory.shift()
      }

      // 计算平滑速度（使用历史记录的平均值）
      this.currentSpeed = this.speedHistory.reduce((sum, speed) => sum + speed, 0) / this.speedHistory.length

      // 更新上次记录
      this.lastTime = now
      this.lastLoaded = loaded
    }
    // 如果时间差太小，保持当前速度不变，避免频繁的0值

    // 计算剩余时间
    const remainingBytes = this.fileSize - loaded
    const remainingTime = this.currentSpeed > 0 ? remainingBytes / this.currentSpeed : 0

    return {
      loaded,
      total: this.fileSize,
      percentage,
      completedChunks: percentage === 100 ? 1 : 0,
      totalChunks: 1,
      speed: Math.max(0, this.currentSpeed), // 确保速度不为负数
      remainingTime: Math.max(0, remainingTime) // 确保剩余时间不为负数
    }
  }
}

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
   * @param config 上传配置
   * @returns {string | null} 错误信息，如果通过验证则返回 null
   */
  validateFileUpload(file: File, currentFiles: FileInfo[] = [], config?: UploadConfig): string | null {
    if (!config) {
      return null // 如果没有配置，跳过验证
    }

    // 查找是否存在同名文件
    const existingFile = currentFiles.find(f => f.name === file.name)

    // 检查单文件大小限制
    if (file.size > config.maxFileSize) {
      return `单个文件大小不能超过${Utils.humanReadableSize(config.maxFileSize)}`
    }

    // 如果不是覆盖操作，才检查文件数量限制
    if (!existingFile && currentFiles.length >= config.maxFiles) {
      return `最多只能上传${config.maxFiles}个文件`
    }

    // 计算当前总大小
    const currentTotalSize = currentFiles.reduce((sum, f) => sum + f.size, 0)

    // 计算预期的总大小
    let expectedTotalSize = currentTotalSize + file.size
    if (existingFile) {
      expectedTotalSize -= existingFile.size // 减去被覆盖文件的大小
    }

    // 检查总大小限制
    if (expectedTotalSize > config.maxTotalSize) {
      return `文件总大小不能超过${Utils.humanReadableSize(config.maxTotalSize)}`
    }

    return null
  },

  /**
   * 初始化分片上传
   */
  initChunkedUpload(filename: string, fileSize: number, chunkSize: number): Promise<InitChunkedUploadResponse> {
    return request.post<InitChunkedUploadResponse>('/file/multipart/init', {
      filename,
      fileSize,
      chunkSize
    })
  },

  /**
   * 上传单个分片
   */
  uploadChunk(uploadId: string, chunkIndex: number, fileKey: string, chunkData: Blob): Promise<UploadChunkResponse> {
    return request.post<UploadChunkResponse>(`/file/multipart/chunk/${uploadId}/${chunkIndex}`, chunkData, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-File-Key': fileKey
      },
      timeout: 5 * 60 * 1000, // 5分钟超时
    })
  },

  /**
   * 完成分片上传
   */
  completeChunkedUpload(uploadId: string, fileKey: string, parts: Array<{
    partNumber: number
    etag: string
  }>): Promise<CompleteChunkedUploadResponse> {
    return request.post<CompleteChunkedUploadResponse>(`/file/multipart/complete/${uploadId}`, {
      fileKey,
      parts
    })
  },

  /**
   * 取消分片上传
   */
  cancelChunkedUpload(uploadId: string, fileKey: string): Promise<void> {
    return request.delete(`/file/multipart/cancel/${uploadId}`, {
      data: { fileKey }
    })
  },

  /**
   * 获取上传配置（缓存版本）
   */
  async getUploadConfig(): Promise<UploadConfig> {
    // 这里可以添加缓存逻辑
    return await configApi.getUploadConfig()
  },

  /**
   * 智能上传文件（根据大小自动选择直传或分片上传）
   * @param file 文件对象
   * @param callbacks 上传回调函数
   */
  async uploadFile(file: File, callbacks: ChunkUploadCallbacks = {}): Promise<{ fileKey: string; etag: string; size: number }> {
    try {
      // 1. 获取上传配置
      const config = await this.getUploadConfig()

      // 2. 验证文件
      const currentFiles = await this.getFileList()
      const validationError = this.validateFileUpload(file, currentFiles, config)
      if (validationError) {
        throw new Error(validationError)
      }

      // 3. 根据文件大小选择上传策略
      if (file.size <= config.chunkThreshold) {
        // 小文件直传
        const controller = new AbortController()
        callbacks.onReady?.({ abort: () => controller.abort() })

        // 创建进度跟踪器
        const progressTracker = new DirectUploadProgressTracker(file.size)

        // 转换进度回调
        const onProgress = callbacks.onProgress ? (percentage: number) => {
          const progress = progressTracker.calculateProgress(percentage)
          callbacks.onProgress?.(progress)
        } : undefined

        const result = await this.uploadFileDirectly(file, onProgress, controller.signal)
        // 手动触发 onComplete
        callbacks.onComplete?.()
        return result
      } else {
        // 大文件分片上传
        return await this.uploadFileInChunks(file, config, callbacks)
      }
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : '上传失败'
      // 如果是取消错误，触发相应的回调或抛出特定错误
      if (error.name === 'AbortError' || errorMessage === '上传已取消') {
        callbacks.onError?.('上传已取消')
        throw new Error('上传已取消')
      }
      // 对于其他错误，触发 onError
      callbacks.onError?.(errorMessage)
      throw error
    }
  },

  /**
   * 直接上传（原有逻辑）
   */
  async uploadFileDirectly(file: File, onProgress?: (progress: number) => void, signal?: AbortSignal): Promise<{ fileKey: string; etag: string; size: number }> {
    const result = await request.post(`/file/${file.name}`, file, {
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
      signal, // 传递 signal
      added: {
        skipResponseTransform: true,
      },
    })

    // 转换返回格式以保持一致性
    return {
      fileKey: file.name,
      etag: result.headers?.etag || '',
      size: file.size
    }
  },

  /**
   * 分片上传
   */
  async uploadFileInChunks(file: File, config: UploadConfig, callbacks: ChunkUploadCallbacks): Promise<{ fileKey: string; etag: string; size: number }> {
    // 创建分片上传API适配器
    const chunkUploadApi: ChunkUploadApi = {
      initChunkedUpload: this.initChunkedUpload.bind(this),
      uploadChunk: this.uploadChunk.bind(this),
      completeChunkedUpload: this.completeChunkedUpload.bind(this),
      cancelChunkedUpload: this.cancelChunkedUpload.bind(this)
    }

    // 创建分片上传器
    const uploader = new ChunkUploader(file, config, chunkUploadApi, callbacks)

    // 开始上传
    return await uploader.upload()
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

  /**
   * 删除所有文件（一键删除）
   * @returns {Promise<{deletedCount: number, message: string}>} 删除结果
   */
  deleteAllFiles(): Promise<{deletedCount: number, message: string}> {
    return request.delete<{deletedCount: number, message: string}>('/file/batch/all')
  },
}
