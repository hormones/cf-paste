/**
 * 上传配置管理 Composable
 * 负责获取、缓存和管理上传配置信息
 */
import { ref, computed } from 'vue'
import { configApi } from '@/api/config'
import type { UploadConfig } from '@/types'

// 全局配置状态
const uploadConfig = ref<UploadConfig | null>(null)
const configLoading = ref(false)
const configError = ref<string | null>(null)

export function useUploadConfig() {
  /**
   * 获取上传配置
   */
  const fetchConfig = async () => {
    if (uploadConfig.value) {
      return uploadConfig.value // 返回缓存的配置
    }

    configLoading.value = true
    configError.value = null

    try {
      const config = await configApi.getUploadConfig()
      uploadConfig.value = config
      return config
    } catch (error) {
      configError.value = error instanceof Error ? error.message : '获取配置失败'

      // 返回默认配置作为降级策略
      const defaultConfig: UploadConfig = {
        maxFileSize: 300 * 1024 * 1024, // 300MB
        maxTotalSize: 300 * 1024 * 1024, // 300MB
        maxFiles: 10,
        chunkSize: 50 * 1024 * 1024, // 50MB
        chunkThreshold: 100 * 1024 * 1024, // 100MB
        maxConcurrent: 3
      }

      uploadConfig.value = defaultConfig
      return defaultConfig
    } finally {
      configLoading.value = false
    }
  }

  /**
   * 重置配置缓存（强制重新获取）
   */
  const resetConfig = () => {
    uploadConfig.value = null
    configError.value = null
  }

  // 计算属性
  const isConfigLoaded = computed(() => uploadConfig.value !== null)

  // 便捷的配置访问器
  const maxFiles = computed(() => uploadConfig.value?.maxFiles ?? 10)
  const maxTotalSize = computed(() => uploadConfig.value?.maxTotalSize ?? 300 * 1024 * 1024)
  const maxFileSize = computed(() => uploadConfig.value?.maxFileSize ?? 300 * 1024 * 1024)

  return {
    // 状态
    uploadConfig: computed(() => uploadConfig.value),
    configLoading: computed(() => configLoading.value),
    configError: computed(() => configError.value),
    isConfigLoaded,

    // 便捷访问器
    maxFiles,
    maxTotalSize,
    maxFileSize,

    // 方法
    fetchConfig,
    resetConfig
  }
}
