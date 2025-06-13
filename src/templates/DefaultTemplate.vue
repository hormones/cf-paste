<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Delete, Setting } from '@element-plus/icons-vue'
import { dataApi } from '../api/data'
import { fileApi } from '../api/file'
import type { Keyword, FileInfo } from '../types'
import { useWordStore } from '@/stores'
import { Utils } from '@/utils'
import { FILE_UPLOAD_LIMITS } from '@/types'
import type { UploadRequestOptions } from 'element-plus'
import PasswordDialog from '@/components/PasswordDialog.vue'
import GlassDialog from '@/components/GlassDialog.vue'
import { Constant } from '@/constant'

// ===================
// 常量定义
// ===================
const MESSAGES = {
  NO_CONTENT: '请输入内容或上传文件',
  SAVE_SUCCESS: '保存成功',
  SAVE_FAILED: '保存失败',
  UPLOAD_SUCCESS: '上传成功',
  UPLOAD_FAILED: '上传失败',
  DELETE_SUCCESS: '删除成功',
  DELETE_FAILED: '删除失败',
  SETTINGS_SAVED: '设置已保存',
  FETCH_FAILED: '获取内容失败',
} as const

const DEBOUNCE_DELAY = 1000
const DEFAULT_EXPIRY_INDEX = 2
const QR_CODE_SIZE = '150x150'

// ===================
// Store 和基础状态
// ===================
const wordStore = useWordStore()
const expiryOptions = Constant.EXPIRY_OPTIONS

// ===================
// 响应式状态
// ===================
// UI 状态
const loading = ref(false)
const uploadLoading = ref(false)
const showPasswordDialog = ref(false)
const showSettings = ref(false)
const viewMode = ref(true)
const activeTab = ref('clipboard')

// 数据状态
const keyword = ref<Keyword>({
  word: wordStore.word,
  view_word: Utils.getRandomWord(6),
  content: '',
  expire_time: Date.now() + expiryOptions[DEFAULT_EXPIRY_INDEX].value * 1000,
  expire_value: expiryOptions[DEFAULT_EXPIRY_INDEX].value, // 添加expire_value初始值
})
const fileList = ref<FileInfo[]>([])
const password = ref('')
const expiry = ref(expiryOptions[DEFAULT_EXPIRY_INDEX].value)
const lastSavedContent = ref('')

// ===================
// 计算属性
// ===================
const remainingUploadSpace = computed(() => {
  const currentSize = fileList.value.reduce((sum, file) => sum + file.size, 0)
  return FILE_UPLOAD_LIMITS.MAX_TOTAL_SIZE - currentSize
})

const usedSpace = computed(() => FILE_UPLOAD_LIMITS.MAX_TOTAL_SIZE - remainingUploadSpace.value)

const qrCodeUrl = computed(() => {
  const baseUrl = 'https://api.qrserver.com/v1/create-qr-code/'
  const params = `?size=${QR_CODE_SIZE}&data=${encodeURIComponent(document.location.href)}`
  return baseUrl + params
})

// 添加只读链接计算属性
const readOnlyUrl = computed(() => {
  return `/v/${keyword.value.view_word}`
})

const canUpload = computed(
  () => !uploadLoading.value && fileList.value.length < FILE_UPLOAD_LIMITS.MAX_FILES
)

const fileTabLabel = computed(() => `文件(${fileList.value.length}个)`)

// ===================
// 工具函数
// ===================
const debounce = <T extends (...args: any[]) => any>(fn: T, delay: number) => {
  let timer: number | null = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

const showMessage = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
  ElMessage({
    message,
    type,
    duration: type === 'success' ? 2000 : 3000,
  })
}

const formatDate = (timestamp?: number) => {
  return !keyword.value.id ? '-' : new Date(timestamp || Date.now()).toLocaleString()
}

// 添加复制链接功能
const copyReadOnlyLink = async () => {
  try {
    const fullUrl = `${window.location.origin}${readOnlyUrl.value}`
    await navigator.clipboard.writeText(fullUrl)
    showMessage('链接已复制到剪贴板')
  } catch (error) {
    // 兜底方案：使用传统方法复制
    const textArea = document.createElement('textarea')
    textArea.value = `${window.location.origin}${readOnlyUrl.value}`
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    showMessage('链接已复制到剪贴板')
  }
}

const resetForm = () => {
  keyword.value = {
    id: null,
    word: wordStore.word,
    view_word: wordStore.view_word,
    content: '',
    expire_time: Date.now() + expiryOptions[DEFAULT_EXPIRY_INDEX].value * 1000,
    expire_value: expiryOptions[DEFAULT_EXPIRY_INDEX].value,
  }
  password.value = ''
  expiry.value = expiryOptions[DEFAULT_EXPIRY_INDEX].value // 重置前端设置变量
  fileList.value = []
  lastSavedContent.value = ''
}

// ===================
// API 处理函数
// ===================
const fetchContent = async () => {
  loading.value = true
  try {
    const data = await dataApi.getKeyword()
    if (data) {
      keyword.value = data
      password.value = data.password || ''
      lastSavedContent.value = data.content || ''

      // 从服务器数据中读取expire_value并设置到前端变量
      if (data.expire_value) {
        expiry.value = data.expire_value
      }

      const files = await fileApi.getFileList()
      fileList.value = files || []
    } else {
      // 如果没有数据，确保 lastSavedContent 与当前内容一致
      lastSavedContent.value = keyword.value.content || ''
    }
    wordStore.setViewWord(keyword.value.view_word!)
  } catch (response: any) {
    handleFetchError(response)
  } finally {
    loading.value = false
  }
}

const handleFetchError = (response: any) => {
  if (response?.status === 403) {
    showPasswordDialog.value = true
  } else {
    console.error(response)
    // 只在非保存操作时显示错误提示
    if (!response?.config?.url?.includes('/api/data')) {
      showMessage(response?.data?.msg || MESSAGES.FETCH_FAILED, 'error')
    }
  }
}

const handleSave = async (silent = false) => {
  loading.value = true
  try {
    if (keyword.value.id) {
      const data: Partial<Keyword> = {
        content: keyword.value.content,
      }
      await dataApi.updateKeyword(data)
    } else {
      const data: Keyword = {
        word: keyword.value.word,
        view_word: keyword.value.view_word,
        content: keyword.value.content,
        expire_time: keyword.value.expire_time, // 保持现有过期时间
      }
      keyword.value.id = await dataApi.createKeyword(data)
    }

    // 在fetchContent后更新最后保存的内容，确保与服务器数据一致
    lastSavedContent.value = keyword.value.content || ''

    if (!silent) {
      showMessage(MESSAGES.SAVE_SUCCESS)
    }
  } catch (_error: any) {
    showMessage(MESSAGES.SAVE_FAILED, 'error')
  } finally {
    loading.value = false
  }
}

// ===================
// 事件处理函数
// ===================
const autoSave = debounce(() => {
  // 检查剪贴板内容是否有变化
  if ((keyword.value.content || '') === lastSavedContent.value) {
    return // 内容没有变化，不需要保存
  }
  handleSave()
}, DEBOUNCE_DELAY)

const handleFileUpload = async (file: File) => {
  uploadLoading.value = true
  try {
    await fileApi.uploadFile(file)
    showMessage(MESSAGES.UPLOAD_SUCCESS)

    // 如果是新的word，需要先创建keyword记录，确保文件能正确显示
    if (!keyword.value.id) {
      await handleSave(true) // 静默保存，创建keyword记录
    }

    // 更新文件列表
    const files = await fileApi.getFileList()
    fileList.value = files || []
  } catch (error: any) {
    showMessage(error?.message || MESSAGES.UPLOAD_FAILED, 'error')
  } finally {
    uploadLoading.value = false
  }
}

const handleFileDelete = async (fileName: string) => {
  try {
    await fileApi.deleteFile(fileName)
    showMessage(MESSAGES.DELETE_SUCCESS)
    await fetchContent()
  } catch (_error: any) {
    showMessage(MESSAGES.DELETE_FAILED, 'error')
  }
}

const handleDelete = async () => {
  try {
    await dataApi.deleteKeyword()
    // 重新生成view_word
    wordStore.setViewWord(Utils.getRandomWord(6))
    // 清空cookie
    Utils.clearLocalStorageAndCookies()
    resetForm()
    showMessage(MESSAGES.DELETE_SUCCESS)
  } catch (_error: any) {
    showMessage(MESSAGES.DELETE_FAILED, 'error')
  }
}

const handleFileDownload = async (fileName: string) => {
  try {
    // 方案1：使用 fetch + blob 方式，避免 SPA 路由拦截
    const response = await fetch(`/api/file/download?name=${encodeURIComponent(fileName)}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/octet-stream',
      },
    })

    if (!response.ok) {
      throw new Error('下载失败')
    }

    // 获取文件内容
    const blob = await response.blob()

    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.style.display = 'none'

    // 触发下载
    document.body.appendChild(a)
    a.click()

    // 清理
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (error: any) {
    showMessage(error?.message || '下载失败', 'error')
  }
}

const handlePasswordVerified = () => {
  fetchContent()
}

const handleSettingsSave = async () => {
  loading.value = true
  try {
    // 调用专用的设置保存API
    await dataApi.saveSettings({
      expire_value: expiry.value,
      password: password.value,
    })

    // 重新加载数据以获取更新后的expire_time
    await fetchContent()

    showSettings.value = false
    showMessage(MESSAGES.SETTINGS_SAVED)
  } catch (_error: any) {
    showMessage('保存设置失败', 'error')
  } finally {
    loading.value = false
  }
}

// ===================
// 生命周期
// ===================
onMounted(async () => {
  await fetchContent()
  // 如果wordStore.word为空，则进入查看模式，否则进入编辑模式
  viewMode.value = !wordStore.word
})
</script>

<template>
  <div class="paste-container">
    <div class="main-content">
      <div class="tabs-container">
        <!-- 标签页头部 -->
        <div class="tabs-header">
          <el-tabs v-model="activeTab" class="custom-tabs">
            <el-tab-pane label="剪贴板" name="clipboard" />
            <el-tab-pane :label="fileTabLabel" name="files" />
          </el-tabs>

          <!-- 右侧操作按钮 -->
          <div class="tab-actions" v-if="!viewMode">
            <el-button type="danger" text @click="handleDelete" class="icon-btn">
              <el-icon><Delete /></el-icon>
            </el-button>
            <el-button type="primary" text @click="showSettings = true" class="icon-btn">
              <el-icon><Setting /></el-icon>
            </el-button>
          </div>
        </div>

        <!-- 标签页内容 -->
        <div class="tab-content">
          <div v-show="activeTab === 'clipboard'" class="tab-pane">
            <el-input
              v-model="keyword.content"
              type="textarea"
              :rows="15"
              placeholder="在此输入或粘贴内容..."
              resize="none"
              @blur="autoSave"
              :disabled="viewMode"
            />
          </div>

          <div v-show="activeTab === 'files'" class="tab-pane">
            <div class="file-header">
              <div class="upload-info">
                <el-upload
                  v-if="!viewMode"
                  :auto-upload="true"
                  :show-file-list="false"
                  :http-request="(options: UploadRequestOptions) => handleFileUpload(options.file)"
                  :disabled="!canUpload"
                >
                  <el-button type="primary" :loading="uploadLoading" :disabled="!canUpload">
                    {{ uploadLoading ? '上传中...' : '上传文件' }}
                  </el-button>
                </el-upload>
                <div class="upload-limits">
                  <div>最多上传 {{ FILE_UPLOAD_LIMITS.MAX_FILES }} 个文件</div>
                  <div>
                    已用空间:
                    {{ Utils.humanReadableSize(usedSpace) }}
                    /
                    {{ Utils.humanReadableSize(FILE_UPLOAD_LIMITS.MAX_TOTAL_SIZE) }}
                  </div>
                </div>
              </div>
            </div>

            <el-table :data="fileList" style="width: 100%">
              <el-table-column prop="name" label="文件名" min-width="140">
                <template #default="{ row }">
                  <el-tooltip
                    :content="row.name"
                    placement="top"
                    :show-after="500"
                    :popper-style="{
                      maxWidth: '300px',
                      wordBreak: 'break-all',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.4',
                    }"
                  >
                    <span class="filename-cell">{{ row.name }}</span>
                  </el-tooltip>
                </template>
              </el-table-column>
              <el-table-column prop="size" label="大小" min-width="90">
                <template #default="{ row }">
                  {{ Utils.humanReadableSize(row.size) }}
                </template>
              </el-table-column>
              <el-table-column prop="uploaded" label="上传时间" min-width="120">
                <template #default="{ row }">
                  {{ new Date(row.uploaded).toLocaleString() }}
                </template>
              </el-table-column>
              <el-table-column label="操作" fixed="right" align="center">
                <template #default="{ row }">
                  <el-button-group>
                    <el-button
                      type="primary"
                      :icon="Download"
                      @click="handleFileDownload(row.name)"
                      text
                    />
                    <el-button
                      v-if="!viewMode"
                      type="danger"
                      :icon="Delete"
                      @click="handleFileDelete(row.name)"
                      text
                    />
                  </el-button-group>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>

      <div class="side-panel" v-if="!viewMode">
        <div class="info-panel">
          <div class="info-item">
            <div class="label">创建时间:</div>
            <div class="value">{{ formatDate(keyword.create_time) }}</div>
          </div>
          <div class="info-item">
            <div class="label">更新时间:</div>
            <div class="value">{{ formatDate(keyword.update_time) }}</div>
          </div>
          <div class="info-item">
            <div class="label">上次查看:</div>
            <div class="value">{{ formatDate(keyword.last_view_time) }}</div>
          </div>
          <div class="info-item">
            <div class="label">过期时间:</div>
            <div class="value">{{ formatDate(keyword.expire_time) }}</div>
          </div>
          <div class="info-item">
            <div class="label">查看次数:</div>
            <div class="value">{{ !keyword.id ? '-' : (keyword.view_count || 0) + '次' }}</div>
          </div>
        </div>

        <div class="qrcode">
          <div class="qrcode-label">只读链接</div>
          <div class="qrcode-content" @click="copyReadOnlyLink">
            <el-image style="width: 150px; height: 150px" :src="qrCodeUrl" />
            <div class="copy-link">点击复制只读链接</div>
          </div>
        </div>
      </div>
    </div>

    <PasswordDialog v-model="showPasswordDialog" @verified="handlePasswordVerified" />

    <!-- 设置对话框 -->
    <GlassDialog v-model:visible="showSettings" title="设置" size="small" width="420px">
      <div class="settings-content">
        <div class="setting-group">
          <label class="setting-label">过期时间</label>
          <el-select v-model="expiry" placeholder="选择有效期" style="width: 100%">
            <el-option
              v-for="option in expiryOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>

        <div class="setting-group">
          <label class="setting-label">访问密码</label>
          <el-input v-model="password" placeholder="留空表示无密码保护" show-password clearable />
          <div class="setting-tip">设置密码后，访问时需要输入密码</div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showSettings = false">取消</el-button>
        <el-button type="primary" @click="handleSettingsSave">保存设置</el-button>
      </template>
    </GlassDialog>
  </div>
</template>

<style scoped>
.paste-container {
  /* CSS 变量定义 */
  --border-color: #e4e7ed;
  --bg-color: #f8f9fa;
  --text-primary: #606266;
  --text-secondary: #909399;
  --border-radius: 8px;
  --spacing-small: 10px;
  --spacing-medium: 15px;
  --spacing-large: 20px;
  --font-size-small: 12px;
  --font-size-normal: 14px;

  /* 容器样式 */
  padding: var(--spacing-large);
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  background: #fff;
}

.main-content {
  display: flex;
  gap: var(--spacing-large);
  flex-direction: row;
}

.tabs-container {
  flex: 1;
  min-width: 0;
}

.side-panel {
  width: 300px;
  flex-shrink: 0;
}

/* 标签页头部样式 */
.tabs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--spacing-large);
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius) var(--border-radius) 0 0;
  border-bottom: none;
}

.custom-tabs {
  flex: 1;
}

.custom-tabs :deep(.el-tabs__header) {
  margin: 0;
  border-bottom: none;
}

.custom-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.tab-actions {
  display: flex;
  gap: var(--spacing-small);
  align-items: center;
}

.tab-content {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 0 0 var(--border-radius) var(--border-radius);
  border-top: 1px solid var(--border-color);
  padding: var(--spacing-large);
}

.tab-pane {
  min-height: 400px;
}

.info-panel {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-large);
  margin-bottom: var(--spacing-large);
}

.info-item {
  display: flex;
  margin-bottom: var(--spacing-medium);
  padding-bottom: var(--spacing-medium);
  border-bottom: 1px solid var(--border-color);
}

.info-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.info-item .label {
  width: 100px;
  color: var(--text-secondary);
  font-size: var(--font-size-normal);
}

.info-item .value {
  color: var(--text-primary);
  font-size: var(--font-size-normal);
}

.qrcode {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-large);
  text-align: center;
}

.qrcode-content {
  cursor: pointer;
}

.qrcode-label {
  margin-bottom: var(--spacing-medium);
  color: var(--text-secondary);
  font-size: var(--font-size-normal);
}

.copy-link {
  font-size: var(--font-size-small);
  user-select: none;
  transition: color 0.2s ease;
}

.file-header {
  margin-bottom: var(--spacing-large);
}

.upload-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-large);
}

.upload-limits {
  color: var(--text-secondary);
  font-size: var(--font-size-small);
}

.filename-cell {
  display: inline-block;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 设置对话框样式 */
.settings-content {
  padding: var(--spacing-small) 0;
}

.setting-group {
  margin-bottom: 24px;
}

.setting-group:last-child {
  margin-bottom: 0;
}

.setting-label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-primary);
  font-size: var(--font-size-normal);
  font-weight: 500;
}

.setting-tip {
  margin-top: 8px;
  color: var(--text-secondary);
  font-size: var(--font-size-small);
  line-height: 1.4;
}

/* 美化组件样式 */
:deep(.el-textarea__inner) {
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-medium);
  background: #fff;
}

:deep(.el-table) {
  border-radius: var(--border-radius);
  overflow: hidden;
  --el-table-border-color: var(--border-color);
}

:deep(.el-input__wrapper),
:deep(.el-select__wrapper) {
  box-shadow: 0 0 0 1px var(--border-color) inset;
  border-radius: 4px;
}

:deep(.el-button) {
  height: 40px;
  padding: 0 var(--spacing-large);
}

.icon-btn {
  width: 32px !important;
  height: 32px !important;
  padding: 0 !important;
  border-radius: 6px !important;
  transition: all 0.2s ease !important;
}

.icon-btn:hover {
  background-color: rgba(0, 0, 0, 0.04) !important;
}

:deep(.el-tabs__content) {
  padding: 0;
}

/* 移动端样式 - 只隐藏侧边栏 */
@media (max-width: 768px) {
  .paste-container {
    padding: var(--spacing-small);
  }

  .main-content {
    flex-direction: column;
  }

  .side-panel {
    display: none;
  }
}
</style>
