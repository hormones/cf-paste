// Platform-specific configuration types

export interface CloudflareConfig {
  D1: string
  R2: string
  ASSETS?: any
}

export interface SelfHostConfig {
  DB_PATH: string
  STORAGE_PATH: string
  PORT: number
  HOST: string
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
