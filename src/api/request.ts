import axios from 'axios'
import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import type { ApiResponse } from '@/types'
import api from './index'
import { ElMessage } from 'element-plus'
import { useI18nComposable } from '@/composables/useI18n'

// Success code agreed with backend
const SUCCESS_CODE = 0

// Extended axios request config with custom options
interface RequestOptions {
  // Whether to globally display request error messages
  logError?: boolean
  // Whether to skip response transformation
  skipResponseTransform?: boolean
}

// Extended custom request config
interface ExpandAxiosRequestConfig<D = any> extends AxiosRequestConfig<D> {
  interceptorHooks?: InterceptorHooks
  added?: RequestOptions
}

// Extended axios request config
interface ExpandInternalAxiosRequestConfig<D = any> extends InternalAxiosRequestConfig<D> {
  interceptorHooks?: InterceptorHooks
  added?: RequestOptions
}

// Extended axios response config
interface ExpandAxiosResponse<T = any, D = any> extends AxiosResponse<T, D> {
  config: ExpandInternalAxiosRequestConfig<D>
}

export interface InterceptorHooks {
  requestInterceptor?: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig
  requestInterceptorCatch?: (error: any) => any
  responseInterceptor?: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>
  responseInterceptorCatch?: (error: any) => any
}

// Request interceptor
const transform: InterceptorHooks = {
  requestInterceptor(config) {
    // Dynamically construct URL
    config.url = `${api.getUrlPrefix()}${config.url}`
    return config
  },
  requestInterceptorCatch(err) {
    // Request error, can use global notification here
    return Promise.reject(err)
  },
  responseInterceptor(response: ExpandAxiosResponse) {
    if (response.status !== 200) return Promise.reject(response)
    // If skip response transformation, return response directly
    if (response.config.added?.skipResponseTransform) {
      return response
    }
    const result = response.data as ApiResponse<any>
    if (result.code !== SUCCESS_CODE) {
      // Global error notification here
      if (response.config.added?.logError) {
        console.error(result.msg)
      }
      return Promise.reject(result)
    }
    // Request return value, recommend destructuring the return value
    return result.data
  },
  responseInterceptorCatch(err: any) {
    // If it's a cancellation error, throw directly for business code to handle
    if (axios.isCancel(err) || err.name === 'AbortError' || err.name === 'CanceledError') {
      return Promise.reject(err)
    }
    // Handle common HTTP errors with global notifications
    const { t } = useI18nComposable()
    const mapErrorStatus = new Map([
      [400, t('errors.requestMethod')],
      [401, t('errors.relogin')],
      [403, t('errors.accessDenied')],
      [404, t('errors.requestAddress')],
      [500, t('errors.server')],
      [502, t('errors.server')],
      [503, t('errors.serviceUnavailable')],
      [504, t('errors.requestTimeout')],
    ])
    // Network error or server didn't return response
    if (!err.response) {
      console.error(t('errors.network'))
      ElMessage.error(t('errors.network'))
      return Promise.reject(err)
    }
    const message =
      err.response.data?.error || mapErrorStatus.get(err.response.status) || t('errors.requestGeneral')
    // Global error notification here
    ElMessage.error(message)
    console.error('Request exception', err)
    return Promise.reject(err)
  },
}

// Export Request class for custom configuration to create instances
class Request {
  // axios instance
  private _instance: AxiosInstance
  // Default configuration
  private _defaultConfig: ExpandAxiosRequestConfig = {
    baseURL: '',
    timeout: 5000,
    added: {
      logError: true,
      skipResponseTransform: false,
    },
  }
  private _interceptorHooks?: InterceptorHooks

  constructor(config: ExpandAxiosRequestConfig) {
    // Use axios.create to create axios instance
    this._instance = axios.create(Object.assign(this._defaultConfig, config))
    this._interceptorHooks = config.interceptorHooks
    this.setupInterceptors()
  }

  // Common interceptors, registered and run during initialization to handle basic properties
  private setupInterceptors() {
    this._instance.interceptors.request.use(
      this._interceptorHooks?.requestInterceptor,
      this._interceptorHooks?.requestInterceptorCatch
    )
    this._instance.interceptors.response.use(
      this._interceptorHooks?.responseInterceptor,
      this._interceptorHooks?.responseInterceptorCatch
    )
  }

  // Define core request
  public request(config: ExpandAxiosRequestConfig): Promise<AxiosResponse> {
    return this._instance.request(config)
  }

  public get<T = any>(url: string, config?: ExpandAxiosRequestConfig): Promise<T> {
    return this._instance.get(url, config)
  }

  public post<T = any>(url: string, data?: any, config?: ExpandAxiosRequestConfig): Promise<T> {
    return this._instance.post(url, data, config)
  }

  public put<T = any>(url: string, data?: any, config?: ExpandAxiosRequestConfig): Promise<T> {
    return this._instance.put(url, data, config)
  }

  public delete<T = any>(url: string, config?: ExpandAxiosRequestConfig): Promise<T> {
    return this._instance.delete(url, config)
  }

  public patch<T = any>(url: string, data?: any, config?: ExpandAxiosRequestConfig): Promise<T> {
    return this._instance.patch(url, data, config)
  }

  public getFile<T = any>(url: string, config: ExpandAxiosRequestConfig = {}): Promise<T> {
    if (!config.added) {
      config.added = {}
    }
    config.added.skipResponseTransform = true
    return this._instance.get(url, config)
  }

  // File upload method - optimized for file upload scenarios
  public uploadFile<T = any>(
    url: string,
    file: File | Blob,
    options?: {
      onProgress?: (percentage: number) => void
      signal?: AbortSignal
      timeout?: number
      headers?: Record<string, string>
    }
  ): Promise<T> {
    const config: ExpandAxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/octet-stream',
        ...options?.headers,
      },
      timeout: options?.timeout || 10 * 60 * 1000, // Default 10 minutes timeout
      signal: options?.signal,
      onUploadProgress: options?.onProgress
        ? (progressEvent) => {
            if (progressEvent.total) {
              const percentage = Math.round((progressEvent.loaded / progressEvent.total) * 100)
              options.onProgress!(percentage)
            }
          }
        : undefined,
    }

    return this._instance.post(url, file, config)
  }
}

// Create request instance for actual use
export const request = new Request({
  baseURL: '',
  timeout: 5000,
  interceptorHooks: transform,
})
