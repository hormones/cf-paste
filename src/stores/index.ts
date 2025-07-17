import { defineStore } from 'pinia'
import type { FileInfo, UploadState, PasteConfig } from '@/types'
import { Utils } from '@/utils'
import { EXPIRY_VALUES, MARKDOWN_MODE } from '@/constants'

export type Theme = 'light' | 'dark'

// Default dark mode time range: 8 PM to 6 AM
const DARK_MODE_START_HOUR = 20
const DARK_MODE_END_HOUR = 6

// Main application state management - only handles state, not business logic
export const useAppStore = defineStore('app', {
  state: () => ({
    // Clipboard state
    viewMode: true,
    keyword: {
      word: '',
      view_word: Utils.getRandomWord(6),
      content: '',
      expire_time: Date.now() + EXPIRY_VALUES[2] * 1000,
      expire_value: EXPIRY_VALUES[2],
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
    expiry: EXPIRY_VALUES[2],

    // UI state
    theme: 'light' as Theme,

    // Markdown state
    markdownMode: MARKDOWN_MODE.EDIT,
  }),

  getters: {
    readOnlyLink(): string {
      return `${window.location.origin}/v/${this.keyword.view_word}`
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

    urlPrefix(): string {
      return this.viewMode ? `/v/${this.keyword.view_word}` : `/${this.keyword.word}`
    },
  },

  actions: {
    setViewMode(isViewMode: boolean) {
      this.viewMode = isViewMode
    },

    setKeyword(keyword: Keyword) {
      this.keyword = keyword
      this.expiry = keyword?.expire_value || EXPIRY_VALUES[2]
      this.password = keyword?.password || ''
    },

    updateKeyword(updates: Partial<Keyword>) {
      Object.assign(this.keyword, updates)
    },

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
      return fileList.length < this.pasteConfig.maxFiles;
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
      this.keyword.id = undefined
      this.keyword.view_word = Utils.getRandomWord(6)
      this.keyword.content = ''
      this.keyword.expire_time = Date.now() + EXPIRY_VALUES[2] * 1000
      this.keyword.expire_value = EXPIRY_VALUES[2]
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
      this.password = this.keyword?.password || ''
      this.expiry = this.keyword?.expire_value || EXPIRY_VALUES[2]
    },

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
    },

    setMarkdownMode(mode: string) {
      this.markdownMode = mode
    },
  },
})
