import { defineStore } from 'pinia'
import type { Keyword, FileInfo, UploadState } from '@/types'
import { Utils } from '@/utils'
import { Constant } from '@/constant'

// 路由状态管理
export const useWordStore = defineStore('word', {
  state: () => ({
    word: null as string | null,
    view_word: null as string | null,
    authorization: '' as string,
  }),
  actions: {
    setWord(word: string) {
      this.word = word
      this.view_word = null
    },
    setViewWord(word: string) {
      this.view_word = word
    },
  },
})

// 主应用状态管理 - 只负责状态，不包含业务逻辑
export const useAppStore = defineStore('app', {
  state: () => ({
    // 剪贴板状态
    keyword: {
      word: undefined,
      view_word: Utils.getRandomWord(6),
      content: '',
      expire_time: Date.now() + Constant.EXPIRY_OPTIONS[2].value * 1000,
      expire_value: Constant.EXPIRY_OPTIONS[2].value
    } as Keyword,
    lastSavedContent: '',
    clipboardLoading: false,
    showPasswordDialog: false,

    // 文件状态
    fileList: [] as FileInfo[],
    uploadStates: new Map() as Map<string, UploadState>,

    // 上传配置状态
    maxFiles: 10,
    maxTotalSize: 100 * 1024 * 1024, // 100MB

    // 设置状态
    showSettings: false,
    password: '',
    expiry: Constant.EXPIRY_OPTIONS[2].value,
    settingsLoading: false,
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
      return this.fileList.length < this.maxFiles &&
             this.usedSpace < this.maxTotalSize
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

    updateKeywordFields(updates: Partial<Keyword>) {
      Object.assign(this.keyword, updates)
    },

    setLastSavedContent(content: string) {
      this.lastSavedContent = content
    },

    setClipboardLoading(loading: boolean) {
      this.clipboardLoading = loading
    },

    setShowPasswordDialog(show: boolean) {
      this.showPasswordDialog = show
    },

    resetKeyword(wordData?: { word?: string; view_word?: string }) {
      this.keyword = {
        id: null,
        word: wordData?.word ?? undefined,
        view_word: wordData?.view_word || Utils.getRandomWord(6),
        content: '',
        expire_time: Date.now() + Constant.EXPIRY_OPTIONS[2].value * 1000,
        expire_value: Constant.EXPIRY_OPTIONS[2].value
      }
      this.lastSavedContent = ''
    },

    // 文件状态更新
    setFileList(files: FileInfo[]) {
      this.fileList = files
    },

    setUploadConfig(config: { maxFiles: number; maxTotalSize: number }) {
      this.maxFiles = config.maxFiles
      this.maxTotalSize = config.maxTotalSize
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

    setSettingsLoading(loading: boolean) {
      this.settingsLoading = loading
    },

    resetSettings() {
      this.password = ''
      this.expiry = Constant.EXPIRY_OPTIONS[2].value
    },
  }
})
