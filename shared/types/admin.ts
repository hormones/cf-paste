/**
 * Admin module type definitions
 */

// Action enum: defines user behavior types
export enum Action {
  CREATE = 1,        // Create content
  UPDATE_CONTENT = 2,  // Update content
  UPLOAD_FILE = 3,     // Upload file
  DOWNLOAD_FILE = 4,   // Download file
  DELETE_FILE = 5,     // Delete file
  VIEW = 6,            // View/Access
  DELETE = 7,          // Delete paste
  AUTO_EXPIRE = 99     // Auto expire
}

// Action label mapping
export const ActionLabels = {
  [Action.CREATE]: '新建',
  [Action.UPDATE_CONTENT]: '修改正文',
  [Action.UPLOAD_FILE]: '上传文件',
  [Action.DOWNLOAD_FILE]: '下载文件',
  [Action.DELETE_FILE]: '删除文件',
  [Action.VIEW]: '访问',
  [Action.DELETE]: '删除',
  [Action.AUTO_EXPIRE]: '自动过期'
} as const

// Activity log record
export interface ActivityLog {
  id?: number
  word: string
  word_id?: number
  ip: string
  country: string
  region: string
  action: Action
  desc?: string       // Description field (for file operations, stores filename)
  actionTime: number
}

// Admin authentication related
export interface AdminAuthRequest {
  password: string
}

export interface AdminAuthResponse {
  success: boolean
  message: string
  token?: string
}

export interface AdminLogoutResponse {
  success: boolean
  message: string
}

// Overview data related
export interface AdminOverviewRequest {
  start?: number  // Start timestamp (milliseconds)
  end?: number    // End timestamp (milliseconds)
}

export interface AdminOverviewResponse {
  totalViews: number      // Total views (action=4)
  totalCreates: number    // Total creates (action=1)
  activeIPs: number       // Active IP count
  todayCreates: number    // Today's creates count
}

// Activity statistics related
export interface AdminActivityRequest {
  start?: number        // Start timestamp (milliseconds)
  end?: number          // End timestamp (milliseconds)
  metric?: 'create' | 'update' | 'delete' | 'view' | 'all'  // Metric filter
  granularity?: 'day' | 'month' | 'year' | 'all'  // Aggregation granularity
}

export interface AdminActivityDataPoint {
  bucket: string        // Time grouping (e.g. "2024-01-15")
  metric: string        // Metric type
  count: number         // Count
  uniqueKeywords?: number  // Unique keywords count (optional)
}

export interface AdminActivityResponse {
  data: AdminActivityDataPoint[]
}

// Ranking related
export interface AdminRankingRequest {
  start?: number  // Start timestamp (milliseconds)
  end?: number    // End timestamp (milliseconds)
}

export interface RankingItem {
  name: string    // IP/Country/Region name
  count: number   // Count
}

export interface AdminRankingResponse {
  topIps: RankingItem[]       // TOP5 IP ranking
  topCountries: RankingItem[] // TOP5 Country ranking
  topRegions: RankingItem[]   // TOP5 Region ranking
}

// Log query related
export interface AdminLogsRequest {
  page?: number           // Page number (starting from 1)
  pageSize?: number       // Page size (default 50, max 200)
  word?: string          // Keyword filter
  ip?: string            // IP filter
  action?: Action        // Action type filter
  country?: string       // Country filter
  region?: string        // Region filter
  desc?: string          // Description filter
  start?: number         // Start timestamp (milliseconds)
  end?: number           // End timestamp (milliseconds)
}

export interface AdminLogItem extends ActivityLog {
  // Action label is now handled by i18n on the frontend
}

export interface AdminLogsResponse {
  items: AdminLogItem[]           // Log items list
  pagination: Pagination // Pagination info
}

// Activity log context
export interface ActivityLogContext {
  ip: string
  country?: string
  region?: string
  userAgent?: string
  referer?: string
}

// Record activity parameters
export interface RecordActivityParams {
  action: Action
  word: string
  wordId?: number | null
  desc?: string       // Description field (for file operations, stores filename)
  context: ActivityLogContext
}
