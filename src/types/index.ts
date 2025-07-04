/** API响应数据结构 */
export interface ApiResponse<T = never> {
  code: number
  data?: T | null
  msg?: string
}

/** 关键词数据结构 */
export interface Keyword {
  id?: number | null
  word?: string
  view_word: string
  content?: string
  password?: string
  expire_time: number
  /** 用户选择的过期时长（秒），默认3天 */
  expire_value?: number
  create_time?: number
  update_time?: number
  last_view_time?: number
  view_count?: number
}

/** 粘贴配置接口 */
export interface PasteConfig {
  /** 单文件最大大小(字节) */
  maxFileSize: number
  /** 总文件大小限制(字节) */
  maxTotalSize: number
  /** 最大文件数量 */
  maxFiles: number
  /** 分片大小(字节) */
  chunkSize: number
  /** 分片上传阈值(字节) - 超过此大小使用分片上传 */
  chunkThreshold: number
}

/** 文件信息结构 */
export interface FileInfo {
  name: string
  size: number
  uploaded: string
  etag: string
}

export interface UploadState {
  currentFile: File
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error: string | null
  cancel?: () => void

  // 速度和时间统计字段 - 支持平滑计算
  startTime?: number // 开始时间(毫秒)
  uploadedBytes?: number // 已上传字节数
  uploadSpeed?: number // 平均上传速度(字节/秒)
  remainingTime?: number // 预估剩余时间(秒)

  // 用于平滑计算的历史记录 (最近5次)
  speedHistory?: Array<{
    timestamp: number // 时间戳(毫秒)
    uploadedBytes: number // 累计上传字节数
  }>
}
