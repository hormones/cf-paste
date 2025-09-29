import { request } from './request'
import type {
  AdminAuthRequest,
  AdminAuthResponse,
  AdminLogoutResponse,
  AdminOverviewRequest,
  AdminOverviewResponse,
  AdminActivityRequest,
  AdminActivityResponse,
  AdminRankingRequest,
  AdminRankingResponse,
  AdminLogsRequest,
  AdminLogsResponse,
} from 'shared/types/admin'

export const adminApi = {
  // Admin authentication
  async login(data: AdminAuthRequest): Promise<AdminAuthResponse> {
    try {
      const response = await request.post('/admin/auth', data, {
        added: {
          logError: false, // Handle auth errors manually
          skipUrlPrefix: true, // Skip urlPrefix for admin routes
        },
      })
      return response
    } catch (error: any) {
      console.error('Admin login failed:', error)
      // Handle auth-specific errors
      const errorMessage = error?.response?.data?.msg || error?.msg || 'Authentication failed'
      return {
        success: false,
        message: errorMessage,
      }
    }
  },

  // Get overview statistics
  async getOverview(params?: AdminOverviewRequest): Promise<AdminOverviewResponse> {
    try {
      return await request.get('/admin/overview', {
        params,
        added: { skipUrlPrefix: true },
      })
    } catch (error) {
      console.error('Failed to get overview data:', error)
      throw error
    }
  },

  // Get activity statistics
  async getActivity(params?: AdminActivityRequest): Promise<AdminActivityResponse> {
    try {
      return await request.get('/admin/activity', {
        params,
        added: { skipUrlPrefix: true },
      })
    } catch (error) {
      console.error('Failed to get activity data:', error)
      throw error
    }
  },

  // Get ranking statistics
  async getRanking(params?: AdminRankingRequest): Promise<AdminRankingResponse> {
    try {
      return await request.get('/admin/ranking', {
        params,
        added: { skipUrlPrefix: true },
      })
    } catch (error) {
      console.error('Failed to get ranking data:', error)
      throw error
    }
  },

  // Get logs with pagination
  async getLogs(params?: AdminLogsRequest): Promise<AdminLogsResponse> {
    try {
      return await request.get('/admin/logs', {
        params,
        added: { skipUrlPrefix: true },
      })
    } catch (error) {
      console.error('Failed to get logs data:', error)
      throw error
    }
  },

  // Logout (clear auth state)
  async logout(): Promise<AdminLogoutResponse> {
    try {
      const response = await request.post(
        '/admin/logout',
        {},
        {
          added: {
            logError: false, // Handle logout errors manually
            skipUrlPrefix: true, // Skip urlPrefix for admin routes
          },
        }
      )
      return response
    } catch (error: any) {
      console.error('Admin logout failed:', error)
      throw error
    }
  },
}
