/** API响应数据结构 */
export interface ApiResponse<T = never> {
  code: number
  data?: T | null
  msg?: string
}

/** 关键词数据结构 */
export interface Keyword {
  id: number
  word: string
  content?: string
  password?: string
  expire_time: string
  create_time: string
  update_time: string
  random_key: string
  last_view_time: string
  view_count: number
}

/** 文件信息结构 */
export interface FileInfo {
  name: string
  size: number
  uploaded: string
  etag: string
}
