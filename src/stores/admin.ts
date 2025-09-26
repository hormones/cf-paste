import { defineStore } from 'pinia'
import type {
  AdminOverviewResponse,
  AdminActivityDataPoint,
  AdminRankingResponse,
  AdminLogItem,
  AdminActivityRequest,
  AdminRankingRequest,
  AdminLogsRequest,
  Action
} from 'shared/types/admin'

export type AdminTab = 'overview' | 'logs'

// Admin filter conditions state
export interface AdminFilters {
  // Common filters
  timeRange?: [number, number] // [start, end] timestamps

  // Activity filters
  activityMetric?: 'create' | 'update' | 'delete' | 'view' | 'all'
  activityGranularity?: 'day' | 'month' | 'year' | 'all'

  // Log filters
  word?: string
  ip?: string
  action?: Action
  country?: string
  region?: string
  logPage?: number
  logPageSize?: number
}

// Data cache interface
export interface AdminDataCache {
  overview?: AdminOverviewResponse
  activity?: AdminActivityDataPoint[]
  ranking?: AdminRankingResponse
  logs?: AdminLogItem[]
  logsPagination?: Pagination

  // Cache timestamps
  overviewCachedAt?: number
  activityCachedAt?: number
  rankingCachedAt?: number
  logsCachedAt?: number
}

// Admin application state management
export const useAdminStore = defineStore('admin', {
  state: () => ({
    // Authentication state
    isAuthenticated: false,
    token: null as string | null,

    // UI state
    currentTab: 'overview' as AdminTab,
    loading: {
      auth: false,
      overview: false,
      activity: false,
      ranking: false,
      logs: false
    },

    // Filter conditions
    filters: {
      timeRange: undefined,
      activityMetric: 'all',
      activityGranularity: 'day',
      logPage: 1,
      logPageSize: 50
    } as AdminFilters,

    // Data cache
    cache: {
      overview: undefined,
      activity: undefined,
      ranking: undefined,
      logs: undefined,
      logsPagination: undefined,
      overviewCachedAt: undefined,
      activityCachedAt: undefined,
      rankingCachedAt: undefined,
      logsCachedAt: undefined
    } as AdminDataCache,

    // Cache TTL (5 minutes)
    cacheTTL: 5 * 60 * 1000
  }),

  getters: {
    // Check if admin is authenticated by cookie
    hasAuthCookie(): boolean {
      if (typeof document === 'undefined') return false
      const cookies = document.cookie.split(';').map(c => c.trim())
      const adminCookie = cookies.find(c => c.startsWith('admin_token='))
      return !!adminCookie
    },

    // Get current time range for requests
    getTimeRangeParams() {
      return (baseFilters?: AdminFilters) => {
        const filters = { ...this.filters, ...baseFilters }
        const params: { start?: number; end?: number } = {}

        if (filters.timeRange) {
          params.start = filters.timeRange[0]
          params.end = filters.timeRange[1]
        }

        return params
      }
    },

    // Get activity request params
    getActivityParams() {
      return (baseFilters?: AdminFilters) => {
        const filters = { ...this.filters, ...baseFilters }
        const params: AdminActivityRequest = {
          ...this.getTimeRangeParams(filters),
          metric: filters.activityMetric,
          granularity: filters.activityGranularity
        }

        return params
      }
    },

    // Get ranking request params
    getRankingParams() {
      return (baseFilters?: AdminFilters) => {
        const filters = { ...this.filters, ...baseFilters }
        const params: AdminRankingRequest = {
          ...this.getTimeRangeParams(filters)
        }

        return params
      }
    },

    // Get logs request params
    getLogsParams() {
      return (baseFilters?: AdminFilters) => {
        const filters = { ...this.filters, ...baseFilters }
        const params: AdminLogsRequest = {
          ...this.getTimeRangeParams(filters),
          page: filters.logPage,
          pageSize: filters.logPageSize,
          word: filters.word,
          ip: filters.ip,
          action: filters.action,
          country: filters.country,
          region: filters.region
        }

        // Remove undefined values
        Object.keys(params).forEach(key => {
          if (params[key as keyof AdminLogsRequest] === undefined) {
            delete params[key as keyof AdminLogsRequest]
          }
        })

        return params
      }
    },

    // Check if cache is valid
    isCacheValid(): (cacheType: keyof AdminDataCache, timestamp?: number) => boolean {
      return (cacheType: keyof AdminDataCache, timestamp?: number) => {
        const cacheTimestamp = timestamp || this.cache[`${cacheType}CachedAt` as keyof AdminDataCache] as number
        if (!cacheTimestamp) return false

        return Date.now() - cacheTimestamp < this.cacheTTL
      }
    }
  },

  actions: {
    // Initialize admin authentication state
    initAuth() {
      this.isAuthenticated = this.hasAuthCookie
      if (this.isAuthenticated) {
        // Try to extract token from cookie if needed
        const cookies = document.cookie.split(';').map(c => c.trim())
        const adminCookie = cookies.find(c => c.startsWith('admin_token='))
        if (adminCookie) {
          this.token = adminCookie.split('=')[1]
        }
      }
    },

    // Set authentication state
    setAuth(token: string) {
      this.isAuthenticated = true
      this.token = token
    },

    // Clear authentication state
    clearAuth() {
      this.isAuthenticated = false
      this.token = null
      // Clear auth-related cache
      this.clearCache()
    },

    // Set current tab
    setCurrentTab(tab: AdminTab) {
      this.currentTab = tab
    },

    // Set loading state
    setLoading(type: keyof typeof this.loading, loading: boolean) {
      this.loading[type] = loading
    },

    // Update filters
    updateFilters(updates: Partial<AdminFilters>) {
      Object.assign(this.filters, updates)
    },

    // Reset filters
    resetFilters() {
      this.filters = {
        timeRange: undefined,
        activityMetric: 'all',
        activityGranularity: 'day',
        logPage: 1,
        logPageSize: 50
      }
    },

    // Cache data with timestamp
    cacheData(type: 'overview' | 'activity' | 'ranking' | 'logs', data: any, pagination?: Pagination) {
      const now = Date.now()

      switch (type) {
        case 'overview':
          this.cache.overview = data as AdminOverviewResponse
          this.cache.overviewCachedAt = now
          break
        case 'activity':
          this.cache.activity = data as AdminActivityDataPoint[]
          this.cache.activityCachedAt = now
          break
        case 'ranking':
          this.cache.ranking = data as AdminRankingResponse
          this.cache.rankingCachedAt = now
          break
        case 'logs':
          this.cache.logs = data as AdminLogItem[]
          this.cache.logsPagination = pagination
          this.cache.logsCachedAt = now
          break
      }
    },

    // Get cached data if valid
    getCachedData(type: 'overview' | 'activity' | 'ranking' | 'logs'): any {
      if (!this.isCacheValid(type)) {
        return null
      }

      switch (type) {
        case 'overview':
          return this.cache.overview || null
        case 'activity':
          return this.cache.activity || null
        case 'ranking':
          return this.cache.ranking || null
        case 'logs':
          if (this.cache.logs) {
            return {
              data: this.cache.logs,
              pagination: this.cache.logsPagination
            }
          }
          return null
        default:
          return null
      }
    },

    // Clear specific cache
    clearCache(type?: 'overview' | 'activity' | 'ranking' | 'logs') {
      if (type) {
        this.cache[type] = undefined
        this.cache[`${type}CachedAt` as keyof AdminDataCache] = undefined
        if (type === 'logs') {
          this.cache.logsPagination = undefined
        }
      } else {
        // Clear all cache
        this.cache = {
          overview: undefined,
          activity: undefined,
          ranking: undefined,
          logs: undefined,
          logsPagination: undefined,
          overviewCachedAt: undefined,
          activityCachedAt: undefined,
          rankingCachedAt: undefined,
          logsCachedAt: undefined
        }
      }
    },

    // Refresh data (force reload)
    refreshData(type?: 'overview' | 'activity' | 'ranking' | 'logs') {
      if (type) {
        this.clearCache(type)
      } else {
        this.clearCache()
      }
    },

    // Auto refresh - refresh data if cache is expired
    autoRefresh() {
      const refreshTypes: ('overview' | 'activity' | 'ranking' | 'logs')[] = []

      if (!this.isCacheValid('overview') && this.cache.overview !== undefined) {
        refreshTypes.push('overview')
      }
      if (!this.isCacheValid('activity') && this.cache.activity !== undefined) {
        refreshTypes.push('activity')
      }
      if (!this.isCacheValid('ranking') && this.cache.ranking !== undefined) {
        refreshTypes.push('ranking')
      }
      if (!this.isCacheValid('logs') && this.cache.logs !== undefined) {
        refreshTypes.push('logs')
      }

      refreshTypes.forEach(type => {
        this.clearCache(type)
      })

      return refreshTypes
    }
  }
})