import type { PasteConfig } from '@/types'
import { request } from './request'

export const passApi = {
  async verifyPassword(password: string): Promise<any> {
    return await request.post('/pass/verify', { password })
  },

  getPasteConfig(): Promise<PasteConfig> {
    return request.get<PasteConfig>('/pass/config')
  },
}
