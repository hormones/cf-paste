// Core business interfaces for platform-agnostic architecture

export interface IRequest {
  // business parameters
  edit: number
  word: string
  view_word: string

  // i18n about
  language: string
  t: (key: string, params?: Record<string, string | number>) => string

  // request about
  request: Request | any
  response?: any
  ip: string
  location: string
  // query params
  params?: Record<string, string>
  json(): Promise<any>
  text(): Promise<string>
  method: string
  // path without query params
  path: string
  getHeader(name: string): string | null

  // authentication cookies
  cookie4auth?: string
  clearCookie4auth?: boolean
  cookie4language?: string
}

export interface IContext {
  platform: 'cloudflare' | 'selfhost' | string
  config: CommonConfig
  platformConfig: any
  original?: any

  // Business capabilities injected via adapters
  db: DatabaseAdapter
  storage: StorageAdapter
  timer?: TimerAdapter
}

export interface ApiResponse<T = any> {
  code: number
  data?: T
  msg?: string
  status?: number
  headers?: Record<string, string>
}

// Adapter interfaces for platform abstraction

export interface DatabaseAdapter {
  query<T = any>(table: string, where: WhereCondition[]): Promise<T[]>
  first<T = any>(table: string, where: WhereCondition[]): Promise<T | null>
  insert(table: string, data: Record<string, any>): Promise<any>
  update(table: string, data: Record<string, any>, where: WhereCondition[]): Promise<any>
  delete(table: string, where: WhereCondition[]): Promise<any>
  batch(operations: DatabaseOperation[]): Promise<any[]>
  transaction<T>(callback: (tx: DatabaseAdapter) => Promise<T>): Promise<T>
}

export interface StorageAdapter {
  upload(options: UploadOptions): Promise<UploadResult>
  download(options: DownloadOptions): Promise<DownloadResult>
  delete(options: DeleteOptions): Promise<DeleteResult>
  list(options: ListOptions): Promise<ListResult>
  deleteFolder(options: DeleteFolderOptions): Promise<DeleteFolderResult>
  createMultipartUpload(options: CreateMultipartUploadOptions): Promise<CreateMultipartUploadResult>
  uploadPart(options: UploadPartOptions): Promise<UploadPartResult>
  completeMultipartUpload(
    options: CompleteMultipartUploadOptions
  ): Promise<CompleteMultipartUploadResult>
  abortMultipartUpload(options: AbortMultipartUploadOptions): Promise<void>
}

export interface TimerAdapter {
  schedule(cron: string, handler: () => Promise<void>): Promise<string>
  cancel(taskId: string): Promise<void>
  list(): Promise<TimerTask[]>
}

// Configuration interfaces

export interface CommonConfig {
  AUTH_KEY: string
  MAX_FILE_SIZE: number
  MAX_TOTAL_SIZE: number
  MAX_FILES: number
  CHUNK_SIZE: number
  CHUNK_THRESHOLD: number
  LANGUAGE: string
}

// Routing and middleware interfaces

export interface Route {
  path: string
  method: string
  handler: (req: IRequest, ctx: IContext) => Promise<ApiResponse>
  middleware?: Middleware[]
}

export type Middleware = (
  req: IRequest,
  ctx: IContext,
  next: () => Promise<ApiResponse>
) => Promise<ApiResponse>

// Database types

export type DatabaseOperation =
  | { type: 'query'; sql: string; params?: any[] }
  | { type: 'insert'; table: string; data: Record<string, any> }
  | { type: 'update'; table: string; data: Record<string, any>; where: WhereCondition[] }
  | { type: 'delete'; table: string; where: WhereCondition[] }

export type WhereCondition = {
  key: string
  value: string | number | Array<string | number>
  operator?: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'LIKE' | 'IN'
}

// Storage types

export interface UploadOptions {
  prefix: string
  name: string
  length: number
  stream: any
}

export interface UploadResult {
  success: boolean
  key?: string
  etag?: string
}

export interface DownloadOptions {
  prefix: string
  name: string
  range?: {
    start: number
    end: number
  }
}

export interface DownloadResult {
  status: number
  headers: Headers
  body: ReadableStream<Uint8Array>
  text(): Promise<string>
}

export interface DeleteOptions {
  prefix: string
  name: string
}

export interface DeleteResult {
  success: boolean
}

export interface ListOptions {
  prefix: string
}

export interface ListResult {
  files: Array<{
    name: string
    size: number
    lastModified: Date
  }>
}

export interface DeleteFolderOptions {
  prefix: string
}

export interface DeleteFolderResult {
  deletedCount: number
}

export interface CreateMultipartUploadOptions {
  prefix: string
  name: string
}

export interface CreateMultipartUploadResult {
  uploadId: string
  key: string
}

export interface UploadPartOptions {
  uploadId: string
  key: string
  partNumber: number
  data: ArrayBuffer
}

export interface UploadPartResult {
  partNumber: number
  etag: string
}

export interface CompleteMultipartUploadOptions {
  uploadId: string
  key: string
  parts: Array<{ partNumber: number; etag: string }>
}

export interface CompleteMultipartUploadResult {
  success: boolean
  etag?: string
}

export interface AbortMultipartUploadOptions {
  uploadId: string
  key: string
}

// Timer types

export interface TimerTask {
  id: string
  cron: string
  nextRun: Date
  isActive: boolean
}

// Business data types

export interface Keyword {
  id?: number
  word: string
  password?: string
  view_word?: string
  view_count?: number
  create_time?: number
  update_time?: number
  expire_time?: number
  expire_value?: number
  last_view_time?: number
  content: string
}

export type KeywordDB = Omit<Keyword, 'content'>

export type ExpiryOption = {
  label: string
  value: number
}
