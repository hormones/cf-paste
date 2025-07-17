declare global {
  interface ApiResponse<T = never> {
    code?: number
    data?: T | null
    msg?: string | null
  }

  interface Keyword {
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

  type ExpiryOption = {
    label: string
    value: number
  }
}

// 确保类型被正确导出
export {}
