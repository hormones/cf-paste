/** API响应数据结构 */
export interface ApiResponse<T = never> {
  code: number
  data?: T | null
  msg?: string
}

/** 关键词数据结构 */
export interface Keyword {
  id?: number
  word: string
  view_word: string
  content?: string
  password?: string
  expire_time: number
  create_time?: number
  update_time?: number
  last_view_time?: number
  view_count?: number
}

/** 文件信息结构 */
export interface FileInfo {
  name: string
  size: number
  uploaded: string
  etag: string
}
