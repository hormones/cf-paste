import { request } from './request'

export const dataApi = {
  async getKeyword(): Promise<Keyword | null> {
    try {
      const response = await request.get('/data')
      return response
    } catch (error) {
      console.error('Failed to fetch keyword:', error)
      throw error
    }
  },

  async createKeyword(data: Keyword): Promise<number> {
    try {
      const response = await request.post('/data', data)
      return response
    } catch (error) {
      console.error('Failed to create keyword:', error)
      throw error
    }
  },

  async updateKeyword(data: Partial<Keyword>): Promise<void> {
    try {
      const response = await request.put('/data', data)
      return response
    } catch (error) {
      console.error('Failed to update keyword:', error)
      throw error
    }
  },

  async deleteKeyword(): Promise<void> {
    try {
      const response = await request.delete('/data')
      return response
    } catch (error) {
      console.error('Failed to delete keyword:', error)
      throw error
    }
  },

  // Save settings for expiration time and password
  saveSettings(settings: { expire_value: number; password?: string }) {
    return request.patch<{ message: string; view_word?: string }>('/data/settings', {
      expire_value: settings.expire_value,
      password: settings.password || null,
    })
  },

  // Reset read-only link
  resetViewWord() {
    return request.patch<{ view_word: string }>('/data/view-word')
  },
}
