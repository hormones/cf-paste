/**
 * 通用工具函数集合
 * @module utils/index
 */

import { Env } from '../types/worker-configuration'

/**
 * 统一日志打印格式
 * 格式: 2024-12-20T15:00:00.000Z [requestId] [location] [functionPath][method] msg
 * @param env 环境变量
 * @param msg 日志内容
 * @param func 日志打印函数
 */
const consoleLog = (
  env: Env,
  func: (msg: string, ...optionalParams: unknown[]) => void,
  msg: string,
  ...optionalParams: unknown[]
) => {
  const timestamp = new Date().toISOString()
  func(
    `${timestamp} [${env.requestId}] [${env.location}] [${env.functionPath}][${env.method}] ${msg}`,
    ...optionalParams,
  )
}

/**
 * 工具函数集合
 */
export const Utils = {
  /**
   * 将字节数转换为人类可读的文件大小
   * @example
   * humanReadableSize(1024) // "1.00 KB"
   * humanReadableSize(1234567) // "1.18 MB"
   * @param size 字节数
   * @returns 格式化后的文件大小
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
   * 打印普通日志
   * @param env 环境变量
   * @param msg 日志内容
   */
  log(env: Env, msg: string, ...optionalParams: unknown[]) {
    consoleLog(env, console.log, msg, ...optionalParams)
  },

  /**
   * 打印警告日志
   * @param env 环境变量
   * @param msg 日志内容
   */
  warn(env: Env, msg: string, ...optionalParams: unknown[]) {
    consoleLog(env, console.warn, msg, ...optionalParams)
  },

  /**
   * 打印错误日志
   * @param env 环境变量
   * @param msg 日志内容
   */
  error(env: Env, msg: string, ...optionalParams: unknown[]) {
    consoleLog(env, console.error, msg, ...optionalParams)
  },
}
