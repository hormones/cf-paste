/**
 * 时间处理工具函数
 * @module utils/time
 */

import { Constant } from '../constant'

/**
 * 验证过期时间值是否有效
 * @param expireValue 过期时间值（秒）
 * @returns 是否有效
 */
export const validateExpireValue = (expireValue: number): boolean => {
  return Constant.ALLOWED_EXPIRE_VALUES.includes(expireValue)
}

/**
 * 计算过期时间戳
 * @param expireValue 过期时长（秒）
 * @returns 过期时间戳（毫秒）
 */
export const calculateExpireTime = (expireValue: number): number => {
  return Date.now() + expireValue * 1000
}

/**
 * 获取当前时间戳（毫秒）
 * @returns 当前时间戳
 */
export const getCurrentTimestamp = (): number => {
  return Date.now()
}

/**
 * 检查是否已过期
 * @param expireTime 过期时间戳（毫秒）
 * @returns 是否已过期
 */
export const isExpired = (expireTime: number): boolean => {
  return Date.now() > expireTime
}
