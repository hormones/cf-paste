import { defineStore } from 'pinia'
import type { Keyword, FileInfo, UploadState, PasteConfig } from '@/types'
import { Utils } from '@/utils'
import { Constant } from '@/constant'

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
    password: '',
    expiry: Constant.EXPIRY_OPTIONS[2].value,

    // UI状态
    isDark: false,
    viewMode: true,
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

    setSettingsData(data: { password: string; expiry: number }) {
      this.password = data.password
      this.expiry = data.expiry
    },

    resetSettings() {
      this.password = ''
      this.expiry = Constant.EXPIRY_OPTIONS[2].value
    },
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
