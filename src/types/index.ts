/** API response data structure */
export interface ApiResponse<T = never> {
  code: number
  data?: T | null
  msg?: string
}

/** Keyword data structure */
export interface Keyword {
  id?: number | null
  word?: string
  view_word: string
  content?: string
  password?: string
  expire_time: number
  /** User-selected expiration duration (seconds), default 3 days */
  expire_value?: number
  create_time?: number
  update_time?: number
  last_view_time?: number
  view_count?: number
}

/** Paste configuration interface */
export interface PasteConfig {
  /** Maximum single file size (bytes) */
  maxFileSize: number
  /** Total file size limit (bytes) */
  maxTotalSize: number
  /** Maximum number of files */
  maxFiles: number
  /** Chunk size (bytes) */
  chunkSize: number
  /** Chunked upload threshold (bytes) - use chunked upload for files exceeding this size */
  chunkThreshold: number
  /** Detected language for i18n */
  language: string
}

/** File information structure */
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

  // Speed and time statistics fields - supports smooth calculation
  startTime?: number // Start time (milliseconds)
  uploadedBytes?: number // Uploaded bytes
  uploadSpeed?: number // Average upload speed (bytes/second)
  remainingTime?: number // Estimated remaining time (seconds)

  // History for smooth calculation (last 5 records)
  speedHistory?: Array<{
    timestamp: number // Timestamp (milliseconds)
    uploadedBytes: number // Cumulative uploaded bytes
  }>
}
