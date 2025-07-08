import { defineStore } from 'pinia'
import type { Keyword, FileInfo, UploadState, PasteConfig } from '@/types'
import { Utils } from '@/utils'
import { Constant } from '@/constant'

export type Theme = 'light' | 'dark'

// Default dark mode time range: 8 PM to 6 AM
const DARK_MODE_START_HOUR = 20
const DARK_MODE_END_HOUR = 6

// Main application state management - only handles state, not business logic
export const useAppStore = defineStore('app', {
  state: () => ({
    // Clipboard state
    keyword: {
      word: undefined,
      view_word: Utils.getRandomWord(6),
      content: '',
      expire_time: Date.now() + Constant.EXPIRY_OPTIONS[2].value * 1000,
      expire_value: Constant.EXPIRY_OPTIONS[2].value,
    } as Keyword,
    lastSavedContent: '',
    loading: false,
    showPasswordDialog: false,

    // File state
    fileList: [] as FileInfo[],
    uploadStates: new Map() as Map<string, UploadState>,

    // Upload configuration state - centralized management
    pasteConfig: null as PasteConfig | null,

    // Settings state
    showSettings: false,
    showQRCodeDialog: false,
    password: '',
    expiry: Constant.EXPIRY_OPTIONS[2].value,

    // UI state
    theme: 'light' as Theme,
    viewMode: true,
    urlPrefix: null as string | null,
  }),

  getters: {
    // Clipboard related computed properties
    hasUnsavedChanges(): boolean {
      return (this.keyword.content || '') !== this.lastSavedContent
    },

    readOnlyLink(): string {
      return `${window.location.origin}/v/${this.keyword.view_word}`
    },

    readOnlyUrl(): string {
      return `/v/${this.keyword.view_word}`
    },

    // File related computed properties
    fileTabLabel(): string {
      const count = this.fileList.length
      return count > 0 ? `Files (${count})` : 'Files'
    },

    usedSpace(): number {
      return this.fileList.reduce((total, file) => total + file.size, 0)
    },

    canUpload(): boolean {
      if (!this.pasteConfig) {
        return false
      }
      return (
        this.fileList.length < this.pasteConfig.maxFiles &&
        this.usedSpace < this.pasteConfig.maxTotalSize
      )
    },

    // Settings related computed properties
    getExpiryOptions() {
      return () => Constant.EXPIRY_OPTIONS
    },
  },

  actions: {
    calculateUrlPrefix(): string {
      if (this.urlPrefix !== null) {
        return this.urlPrefix
      }
      const path = window.location.pathname
      // First match /v/xxx
      const viewMatch = path.match(/^\/v\/[a-zA-Z0-9_]+/)
      if (viewMatch) {
        this.urlPrefix = viewMatch[0]
        return this.urlPrefix
      }
      // Then match /xxx
      const wordMatch = path.match(/^\/[a-zA-Z0-9_]+/)
      if (wordMatch) {
        this.urlPrefix = wordMatch[0]
        return this.urlPrefix
      }
      this.urlPrefix = ''
      return this.urlPrefix
    },

    // Clipboard state updates
    setKeyword(keyword: Keyword) {
      this.keyword = keyword
    },

    // Check if file can be uploaded, allows overwriting
    uploadFileCheck(file: File | null): boolean {
      if (!this.pasteConfig) {
        return false
      }
      let fileList = this.fileList
      let usedSpace = this.usedSpace
      if (file) {
        if (file.size > this.pasteConfig.maxFileSize) {
          return false
        }
        fileList = this.fileList.filter((f) => f.name !== file.name)
        usedSpace = fileList.reduce((total, file) => total + file.size, 0)
      }
      if (usedSpace + (file?.size || 0) >= this.pasteConfig.maxTotalSize) {
        return false
      }
      if (fileList.length >= this.pasteConfig.maxFiles) {
        return false
      }
      return true
    },

    updateKeywordFields(updates: Partial<Keyword>) {
      Object.assign(this.keyword, updates)
    },

    setLastSavedContent(content: string) {
      this.lastSavedContent = content
    },

    setLoading(loading: boolean) {
      this.loading = loading
    },

    setShowPasswordDialog(show: boolean) {
      this.showPasswordDialog = show
    },

    resetKeyword() {
      this.keyword.id = null
      this.keyword.view_word = Utils.getRandomWord(6)
      this.keyword.content = ''
      this.keyword.expire_time = Date.now() + Constant.EXPIRY_OPTIONS[2].value * 1000
      this.keyword.expire_value = Constant.EXPIRY_OPTIONS[2].value
      this.lastSavedContent = ''
      this.fileList = []
      this.password = ''
      Utils.clearCookies()
      this.uploadStates.clear()
    },

    // File state updates
    setFileList(files: FileInfo[]) {
      this.fileList = files
    },

    setPasteConfig(config: PasteConfig) {
      this.pasteConfig = config
    },

    addUploadState(fileName: string, state: UploadState) {
      this.uploadStates.set(fileName, state)
    },

    updateUploadState(fileName: string, updates: Partial<UploadState>) {
      const state = this.uploadStates.get(fileName)
      if (state) {
        Object.assign(state, updates)
      }
    },

    removeUploadState(fileName: string) {
      this.uploadStates.delete(fileName)
    },

    clearUploadStates() {
      this.uploadStates.clear()
    },

    // Settings state updates
    setShowSettings(show: boolean) {
      this.showSettings = show
    },

    setShowQRCodeDialog(visible: boolean) {
      this.showQRCodeDialog = visible
    },

    setSettingsData(data: { password: string; expiry: number }) {
      this.password = data.password
      this.expiry = data.expiry
    },

    resetSettings() {
      this.password = ''
      this.expiry = Constant.EXPIRY_OPTIONS[2].value
    },

    // Theme management actions

    // Apply current theme settings to DOM
    _applyTheme() {
      if (this.theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    },

    // Toggle theme between light and dark
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', this.theme)
      this._applyTheme()
    },

    // Initialize theme: 1. Read from localStorage first. 2. If not available, set based on current time.
    initTheme() {
      const savedTheme = localStorage.getItem('theme') as Theme | null

      if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
        this.theme = savedTheme
      } else {
        // If no saved theme, decide initial theme based on time
        const currentHour = new Date().getHours()
        if (currentHour >= DARK_MODE_START_HOUR || currentHour < DARK_MODE_END_HOUR) {
          this.theme = 'dark'
        } else {
          this.theme = 'light'
        }
      }
      this._applyTheme()
    }
  },
})

// export const useMainStore = defineStore('main', {
//   state: () => ({
//     // 是否暗黑模式
//     isDark: false,
//     // 是否为分享者模式
//     isOwnerMode: true,
//     // 下载会话Token（仅浏览者模式使用）
//     sessionToken: '',
//   }),
//   getters: {
//     // ...
//   },
//   actions: {
//     // ...
//   }
// })
