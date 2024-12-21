import { Env } from '../types/worker-configuration'

/**
 * function日志统一打印规范
 * 格式: 2024-12-20T15:00:00.000Z [requestId] [location] [functionPath][method] msg
 *
 * @param env 环境变量
 * @param msg 日志内容
 * @param func 日志打印函数
 */
const consoleLog = (env: Env, msg: string, func: (msg: string) => void) => {
  const timestamp = new Date().toISOString()
  func(
    `${timestamp} [${env.requestId}] [${env.location}] [${env.functionPath}][${env.method}] ${msg}`,
  )
}

export const Utils = {
  /**
   * 将字节数转换为人类可读的文件大小
   * @param size 字节数
   * @returns 人类可读的文件大小
   */
  humanReadableSize(size: number) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let unitIndex = 0
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`
  },
  /**
   * 日志打印
   * @param env 环境变量
   * @param msg 日志内容
   */
  log(env: Env, msg: string) {
    consoleLog(env, msg, console.log)
  },
  /**
   * 警告日志打印
   * @param env 环境变量
   * @param msg 日志内容
   */
  warn(env: Env, msg: string) {
    consoleLog(env, msg, console.warn)
  },
  /**
   * 错误日志打印
   * @param env 环境变量
   * @param msg 日志内容
   */
  error(env: Env, msg: string) {
    consoleLog(env, msg, console.error)
  },
}
