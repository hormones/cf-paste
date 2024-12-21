// 定义一个常见后端请求返回
export type ApiResponse<T> = {
  code: number
  msg: string
  data: T
}
