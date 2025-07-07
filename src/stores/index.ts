import { defineStore } from 'pinia'
import type { Keyword, FileInfo, UploadState, PasteConfig } from '@/types'
import { Utils } from '@/utils'
import { Constant } from '@/constant'

export type Theme = 'light' | 'dark'

// 默认晚上 8 点到早上 6 点为深色模式的判断标准
const DARK_MODE_START_HOUR = 20
const DARK_MODE_END_HOUR = 6

// 主应用状态管理 - 只负责状态，不包含业务逻辑
export const useAppStore = defineStore('app', {
  state: () => ({
    // 剪贴板状态
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

    // 文件状态
    fileList: [] as FileInfo[],
    uploadStates: new Map() as Map<string, UploadState>,

    // 上传配置状态 - 集中管理
    pasteConfig: null as PasteConfig | null,

    // 设置状态
    showSettings: false,
    showQRCodeDialog: false,
    password: '',
    expiry: Constant.EXPIRY_OPTIONS[2].value,

    // UI状态
    theme: 'light' as Theme,
    viewMode: true,
    urlPrefix: null as string | null,
  }),

  getters: {
    // 剪贴板相关计算属性
    hasUnsavedChanges(): boolean {
      return (this.keyword.content || '') !== this.lastSavedContent
    },

    readOnlyLink(): string {
      return `${window.location.origin}/v/${this.keyword.view_word}`
    },

    readOnlyUrl(): string {
      return `/v/${this.keyword.view_word}`
    },

    // 文件相关计算属性
    fileTabLabel(): string {
      const count = this.fileList.length
      return count > 0 ? `文件 (${count})` : '文件'
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

    // 设置相关计算属性
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
      // 优先匹配 /v/xxx
      const viewMatch = path.match(/^\/v\/[a-zA-Z0-9_]+/)
      if (viewMatch) {
        this.urlPrefix = viewMatch[0]
        return this.urlPrefix
      }
      // 再匹配 /xxx
      const wordMatch = path.match(/^\/[a-zA-Z0-9_]+/)
      if (wordMatch) {
        this.urlPrefix = wordMatch[0]
        return this.urlPrefix
      }
      this.urlPrefix = ''
      return this.urlPrefix
    },

    // 剪贴板状态更新
    setKeyword(keyword: Keyword) {
      this.keyword = keyword
    },

    /**
     * 检查是否可以上传文件
     * @param file 上传的文件，允许覆盖
     * @returns 是否可以上传
     */
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

    // 文件状态更新
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

    // 设置状态更新
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

    // ==================
    // 主题管理 Actions
    // ==================

    /**
     * 应用当前主题设置到 DOM
     * @private
     */
    _applyTheme() {
      if (this.theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    },

    /**
     * 切换主题：在 light 和 dark 之间循环
     */
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', this.theme)
      this._applyTheme()
    },

    /**
     * 初始化主题
     * 1. 优先从 localStorage 读取用户设置。
     * 2. 如果没有，则根据当前时间设置初始主题。
     */
    initTheme() {
      const savedTheme = localStorage.getItem('theme') as Theme | null

      if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
        this.theme = savedTheme
      } else {
        // 如果没有保存的主题，根据时间来决定初始主题
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
