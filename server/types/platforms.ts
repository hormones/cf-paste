// Platform-specific configuration types

export interface CloudflareConfig {
  DB: D1Database
  R2: R2Bucket
  ASSETS?: any
}

export interface SelfHostConfig {
  PORT: number
  DB_PATH: string
  STORAGE_PATH: string
}

export type PlatformConfig = CloudflareConfig | SelfHostConfig

export enum PlatformType {
  CLOUDFLARE = 'cloudflare',
  SELF_HOST = 'selfhost'
}

export interface PlatformAdapter {
  createRequest: (request: any, env?: any) => any
  createContext: (env: any) => any
  createResponse: (response: any) => any
}
