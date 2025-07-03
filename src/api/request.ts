import axios from 'axios'
import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import type { ApiResponse } from '@/types'
import { Utils } from '@/utils'

// 与后端约定的请求成功码
const SUCCESS_CODE = 0

// 拓展 axios 请求配置，加入我们自己的配置
interface RequestOptions {
  // 是否全局展示请求错误信息
  logError?: boolean
  // 是否跳过响应转换
  skipResponseTransform?: boolean
}

// 拓展自定义请求配置
interface ExpandAxiosRequestConfig<D = any> extends AxiosRequestConfig<D> {
  interceptorHooks?: InterceptorHooks
  added?: RequestOptions
}

// 拓展 axios 请求配置
interface ExpandInternalAxiosRequestConfig<D = any> extends InternalAxiosRequestConfig<D> {
  interceptorHooks?: InterceptorHooks
  added?: RequestOptions
}

// 拓展 axios 返回配置
interface ExpandAxiosResponse<T = any, D = any> extends AxiosResponse<T, D> {
  config: ExpandInternalAxiosRequestConfig<D>
}

export interface InterceptorHooks {
  requestInterceptor?: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig
  requestInterceptorCatch?: (error: any) => any
  responseInterceptor?: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>
  responseInterceptorCatch?: (error: any) => any
}

// 请求拦截器
const transform: InterceptorHooks = {
  requestInterceptor(config) {
    // 动态拼接 URL
    const word = Utils.getWordFromPath()
    if (word && config.url) {
      config.url = `/${word}/api${config.url}`
    }
    return config
  },
  requestInterceptorCatch(err) {
    // 请求错误，这里可以用全局提示框进行提示
    return Promise.reject(err)
  },
  responseInterceptor(response: ExpandAxiosResponse) {
    if (response.status !== 200) return Promise.reject(response)
    // 如果跳过响应转换，则直接返回响应
    if (response.config.added?.skipResponseTransform) {
      return response
    }
    const result = response.data as ApiResponse<any>
    if (result.code !== SUCCESS_CODE) {
      // 这里全局提示错误
      if (response.config.added?.logError) {
        console.error(result.msg)
      }
      return Promise.reject(result)
    }
    // 请求返回值，建议将 返回值 进行解构
    return result.data
  },
  responseInterceptorCatch(err: any) {
    // 如果是取消请求导致的错误，则直接抛出，由业务代码处理
    if (axios.isCancel(err) || err.name === 'AbortError' || err.name === 'CanceledError') {
      return Promise.reject(err)
    }
    // 这里用来处理 http 常见错误，进行全局提示
    const mapErrorStatus = new Map([
      [400, '请求方式错误'],
      [401, '请重新登录'],
      [403, '拒绝访问'],
      [404, '请求地址有误'],
      [500, '服务器出错'],
      [502, '服务器出错'],
      [503, '服务不可用'],
      [504, '请求超时'],
    ])
    // 网络错误或服务器未返回响应
    if (!err.response) {
      console.error('网络错误，请检查您的网络连接')
      return Promise.reject(err)
    }
    const message = mapErrorStatus.get(err.response.status) || '请求出错，请稍后再试'
    // 此处全局报错
    console.error(message)
    return Promise.reject(err)
  },
}

// 导出Request类，可以用来自定义传递配置来创建实例
class Request {
  // axios 实例
  private _instance: AxiosInstance
  // 默认配置
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
    // 使用axios.create创建axios实例
    this._instance = axios.create(Object.assign(this._defaultConfig, config))
    this._interceptorHooks = config.interceptorHooks
    this.setupInterceptors()
  }

  // 通用拦截，在初始化时就进行注册和运行，对基础属性进行处理
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

  // 定义核心请求
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

  /**
   * 文件上传专用方法 - 针对文件上传场景优化
   * @param url 上传地址
   * @param file 文件数据
   * @param options 上传选项
   */
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
      timeout: options?.timeout || 10 * 60 * 1000, // 默认10分钟超时
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

// 具体使用时先实例一个请求对象
export const request = new Request({
  baseURL: '',
  timeout: 5000,
  interceptorHooks: transform,
})
