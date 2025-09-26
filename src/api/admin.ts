import { request } from './request'
import type {
  AdminAuthRequest,
  AdminAuthResponse,
  AdminOverviewRequest,
  AdminOverviewResponse,
  AdminActivityRequest,
  AdminActivityResponse,
  AdminRankingRequest,
  AdminRankingResponse,
  AdminLogsRequest,
  AdminLogsResponse
} from 'shared/types/admin'

// Get auth headers with admin token
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}

  // Check for admin token from cookie
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';').map(c => c.trim())
    const adminCookie = cookies.find(c => c.startsWith('admin_token='))
    if (adminCookie) {
      const token = adminCookie.split('=')[1]
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  return headers
}

export const adminApi = {
  // Admin authentication
  async login(data: AdminAuthRequest): Promise<AdminAuthResponse> {
    try {
      const response = await request.post('/admin/auth', data, {
        added: {
          logError: false, // Handle auth errors manually
          skipUrlPrefix: true // Skip urlPrefix for admin routes
        }
      })
      return response
    } catch (error: any) {
      console.error('Admin login failed:', error)
      // Handle auth-specific errors
      const errorMessage = error?.response?.data?.msg || error?.msg || 'Authentication failed'
      return {
        success: false,
        message: errorMessage
      }
    }
  },

  // Get overview statistics
  async getOverview(params?: AdminOverviewRequest): Promise<AdminOverviewResponse> {
    try {
      return await request.get('/admin/overview', {
        params,
        headers: getAuthHeaders(),
        added: { skipUrlPrefix: true }
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
        headers: getAuthHeaders(),
        added: { skipUrlPrefix: true }
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
        headers: getAuthHeaders(),
        added: { skipUrlPrefix: true }
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
        headers: getAuthHeaders(),
        added: { skipUrlPrefix: true }
      })
    } catch (error) {
      console.error('Failed to get logs data:', error)
      throw error
    }
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    if (typeof document === 'undefined') return false
    const cookies = document.cookie.split(';').map(c => c.trim())
    return !!cookies.find(c => c.startsWith('admin_token='))
  },

  // Logout (clear auth state)
  logout(): void {
    // Clear auth cookie by setting it to expire
    if (typeof document !== 'undefined') {
      document.cookie = 'admin_token=; path=/admin; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }
  }
}