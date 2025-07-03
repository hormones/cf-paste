/**
 * 配置相关API
 */
import { request } from './request'

/** 上传配置接口 */
export interface UploadConfig {
  /** 单文件最大大小(字节) */
  maxFileSize: number
  /** 总文件大小限制(字节) */
  maxTotalSize: number
  /** 最大文件数量 */
  maxFiles: number
  /** 分片大小(字节) */
  chunkSize: number
  /** 分片上传阈值(字节) - 超过此大小使用分片上传 */
  chunkThreshold: number
  /** 最大并发分片数 */
  maxConcurrent: number
}

export const configApi = {
  /**
   * 获取上传配置
   * @returns {Promise<UploadConfig>} 上传配置信息
   */
  getUploadConfig(): Promise<UploadConfig> {
    return request.get<UploadConfig>('/config/pass/paste')
  },
}
