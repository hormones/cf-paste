/**
 * 分片上传工具类
 * 负责文件分片、并发上传控制、错误重试、进度计算等核心功能
 */
import type { UploadConfig } from '@/api/config'
import { request } from '@/api/request'

/** 分片信息 */
export interface ChunkInfo {
  /** 分片索引（从0开始） */
  index: number
  /** 分片数据 */
  data: Blob
  /** 分片大小 */
  size: number
  /** 上传状态 */
  status: 'pending' | 'uploading' | 'completed' | 'failed'
  /** 重试次数 */
  retryCount: number
  /** ETag（上传成功后设置） */
  etag?: string
  /** 错误信息 */
  error?: string
}

/** 上传进度信息 */
export interface UploadProgress {
  /** 已上传的字节数 */
  loaded: number
  /** 文件总字节数 */
  total: number
  /** 上传进度百分比（0-100） */
  percentage: number
  /** 已完成的分片数 */
  completedChunks: number
  /** 总分片数 */
  totalChunks: number
  /** 上传速度（字节/秒） */
  speed: number
  /** 预估剩余时间（秒） */
  remainingTime: number
}

/** 分片上传回调函数 */
export interface ChunkUploadCallbacks {
  /** 上传任务就绪回调，返回上传器实例 */
  onReady?: (uploader: { abort: () => void }) => void
  /** 进度更新回调 */
  onProgress?: (progress: UploadProgress) => void
  /** 分片上传成功回调 */
  onChunkComplete?: (chunkIndex: number, etag: string) => void
  /** 分片上传失败回调 */
  onChunkError?: (chunkIndex: number, error: string) => void
  /** 上传完成回调 */
  onComplete?: () => void
  /** 上传失败回调 */
  onError?: (error: string) => void
}

/** 分片上传API接口 */
export interface ChunkUploadApi {
  /** 初始化分片上传 */
  initChunkedUpload: (filename: string, fileSize: number, chunkSize: number) => Promise<{
    uploadId: string
    fileKey: string
    totalChunks: number
  }>
  /** 上传单个分片 */
  uploadChunk: (uploadId: string, chunkIndex: number, fileKey: string, chunkData: Blob) => Promise<{
    partNumber: number
    etag: string
  }>
  /** 完成分片上传 */
  completeChunkedUpload: (uploadId: string, fileKey: string, parts: Array<{
    partNumber: number
    etag: string
  }>) => Promise<{
    fileKey: string
    etag: string
    size: number
  }>
  /** 取消分片上传 */
  cancelChunkedUpload: (uploadId: string, fileKey: string) => Promise<void>
}

/**
 * 分片上传器类
 */
export class ChunkUploader {
  private file: File
  private config: UploadConfig
  private api: ChunkUploadApi
  private callbacks: ChunkUploadCallbacks

  private chunks: ChunkInfo[] = []
  private uploadId: string = ''
  private fileKey: string = ''
  private aborted: boolean = false
  private startTime: number = 0

  // 并发控制
  private concurrentSlots: number = 0
  private readonly maxConcurrent: number

  // 进度统计
  private completedBytes: number = 0
  private lastProgressTime: number = 0
  private lastCompletedBytes: number = 0
  private chunkProgressMap: Map<number, number> = new Map()
  private chunkControllers: Map<number, AbortController> = new Map()
  private progressUpdateTimer: any = null
  private lastSpeed: number = 0

  constructor(
    file: File,
    config: UploadConfig,
    api: ChunkUploadApi,
    callbacks: ChunkUploadCallbacks = {}
  ) {
    this.file = file
    this.config = config
    this.api = api
    this.callbacks = callbacks
    this.maxConcurrent = config.maxConcurrent
  }

  /**
   * 开始分片上传
   */
  async upload(): Promise<{ fileKey: string; etag: string; size: number }> {
    try {
      this.startTime = Date.now()
      this.aborted = false

      // 1. 创建分片
      this.createChunks()

      // 2. 初始化上传
      const initResult = await this.api.initChunkedUpload(
        this.file.name,
        this.file.size,
        this.config.chunkSize
      )

      this.uploadId = initResult.uploadId
      this.fileKey = initResult.fileKey

      // 触发 onReady 回调，传递 uploader 实例
      this.callbacks.onReady?.(this)

      // 启动进度更新定时器
      this.startProgressUpdater()

      // 3. 并发上传分片
      await this.uploadChunksConcurrently()

      if (this.aborted) {
        throw new Error('上传已取消')
      }

      // 4. 完成上传
      const parts = this.chunks.map(chunk => ({
        partNumber: chunk.index + 1,
        etag: chunk.etag!
      }))

      const result = await this.api.completeChunkedUpload(this.uploadId, this.fileKey, parts)

      this.callbacks.onComplete?.()
      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败'
      // 如果不是取消错误，才触发 onError
      if (errorMessage !== '上传已取消') {
        this.callbacks.onError?.(errorMessage)
      }
      throw error
    } finally {
      // 停止进度更新定时器
      this.stopProgressUpdater()
    }
  }

  /**
   * 取消上传
   */
  async abort(): Promise<void> {
    this.aborted = true

    // 立即中止所有正在进行的请求
    this.chunkControllers.forEach(controller => controller.abort())
    this.chunkControllers.clear()

    // 停止进度更新定时器
    this.stopProgressUpdater()

    if (this.uploadId && this.fileKey) {
      try {
        await this.api.cancelChunkedUpload(this.uploadId, this.fileKey)
      } catch (error) {
        console.warn('取消上传时出错:', error)
      }
    }
  }

  /**
   * 创建文件分片
   */
  private createChunks(): void {
    const chunkSize = this.config.chunkSize
    const totalChunks = Math.ceil(this.file.size / chunkSize)

    this.chunks = []

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, this.file.size)
      const data = this.file.slice(start, end)

      this.chunks.push({
        index: i,
        data,
        size: data.size,
        status: 'pending',
        retryCount: 0
      })
    }
  }

  /**
   * 并发上传分片
   */
  private async uploadChunksConcurrently(): Promise<void> {
    const promises: Promise<void>[] = []

    for (const chunk of this.chunks) {
      promises.push(this.uploadSingleChunk(chunk))
    }

    await Promise.all(promises)
  }

  /**
   * 上传单个分片（包含重试逻辑）
   */
  private async uploadSingleChunk(chunk: ChunkInfo): Promise<void> {
    const maxRetries = 3
    let controller: AbortController

    while (chunk.retryCount <= maxRetries && !this.aborted) {
      controller = new AbortController()
      this.chunkControllers.set(chunk.index, controller)

      try {
        // 等待并发槽位
        await this.waitForSlot()

        if (this.aborted) {
          this.releaseSlot()
          return
        }

        chunk.status = 'uploading'

        // 上传分片，带实时进度更新
        const result = await request.post<{ partNumber: number; etag: string }>(
          `/file/multipart/chunk/${this.uploadId}/${chunk.index}`,
          chunk.data,
          {
            headers: {
              'Content-Type': 'application/octet-stream',
              'X-File-Key': this.fileKey
            },
            timeout: 5 * 60 * 1000,
            signal: controller.signal,
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                // 更新该分片的实时进度
                this.updateChunkProgress(chunk.index, progressEvent.loaded)
              }
            }
          }
        )

        // 更新分片状态
        chunk.status = 'completed'
        chunk.etag = result.etag

        // 确保分片完成时进度为100%
        this.updateChunkProgress(chunk.index, chunk.size)

        this.callbacks.onChunkComplete?.(chunk.index, result.etag)
        this.releaseSlot()
        return

      } catch (error: any) {
        // 如果不是取消错误，则进行重试
        if (error.name !== 'AbortError') {
          chunk.retryCount++
          chunk.status = 'failed'
          chunk.error = error.message
          this.callbacks.onChunkError?.(chunk.index, error.message)

          if (chunk.retryCount > maxRetries) {
            // 如果不是主动取消，则抛出错误中断整个上传
            if (!this.aborted) {
              throw new Error(`分片 ${chunk.index} 上传失败，已达最大重试次数`)
            }
          }
        }
      } finally {
        this.releaseSlot()
        this.chunkControllers.delete(chunk.index)
      }
    }
  }

  /**
   * 等待并发槽位
   */
  private async waitForSlot(): Promise<void> {
    while (this.concurrentSlots >= this.maxConcurrent && !this.aborted) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    this.concurrentSlots++
  }

  /**
   * 释放并发槽位
   */
  private releaseSlot(): void {
    this.concurrentSlots = Math.max(0, this.concurrentSlots - 1)
  }

  /**
   * 更新分片进度
   */
  private updateChunkProgress(chunkIndex: number, loadedBytes: number): void {
    // 记录该分片的已上传字节数
    this.chunkProgressMap.set(chunkIndex, loadedBytes)

    // 计算总的已上传字节数
    let totalLoaded = 0
    for (let i = 0; i < this.chunks.length; i++) {
      const chunkProgress = this.chunkProgressMap.get(i) || 0
      totalLoaded += chunkProgress
    }

    this.updateProgressWithBytes(totalLoaded)
  }

  /**
   * 启动进度更新定时器
   */
  private startProgressUpdater(): void {
    if (this.progressUpdateTimer) return

    this.progressUpdateTimer = setInterval(() => {
      this.updateProgressWithBytes(this.completedBytes)
    }, 1000) // 每秒更新一次
  }

  /**
   * 停止进度更新定时器
   */
  private stopProgressUpdater(): void {
    if (this.progressUpdateTimer) {
      clearInterval(this.progressUpdateTimer)
      this.progressUpdateTimer = null
    }
  }

  /**
   * 基于总字节数更新进度
   */
  private updateProgressWithBytes(loadedBytes: number): void {
    this.completedBytes = loadedBytes
    const now = Date.now()
    const timeDiff = (now - this.lastProgressTime) / 1000

    let speed = this.lastSpeed
    // 每秒更新一次速度
    if (timeDiff >= 1) {
      const bytesDiff = this.completedBytes - this.lastCompletedBytes
      speed = bytesDiff / timeDiff

      this.lastProgressTime = now
      this.lastCompletedBytes = this.completedBytes
      this.lastSpeed = speed
    }

    // 避免除以零
    const remainingBytes = this.file.size - this.completedBytes
    const remainingTime = speed > 0 ? remainingBytes / speed : Infinity

    const progress: UploadProgress = {
      loaded: this.completedBytes,
      total: this.file.size,
      percentage: Math.min(100, Math.round((this.completedBytes / this.file.size) * 100)),
      completedChunks: this.chunks.filter(c => c.status === 'completed').length,
      totalChunks: this.chunks.length,
      speed,
      remainingTime
    }

    this.callbacks.onProgress?.(progress)
  }
}
