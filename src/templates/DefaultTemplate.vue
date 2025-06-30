<script setup lang="ts">
/**
 * 默认模板组件 - 重构版
 * 采用Composable架构，轻量化设计，职责分离
 */
import { ref, computed, onMounted } from 'vue'
import { Download, Delete, Setting, UploadFilled } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import type { UploadRequestOptions } from 'element-plus'

// 组件导入
import PasswordDialog from '@/components/PasswordDialog.vue'
import GlassDialog from '@/components/GlassDialog.vue'
import QRCode from '@/components/QRCode.vue'
import UploadProgress from '@/components/upload/UploadProgress.vue'

// Composable导入 - 业务逻辑分离
import { useUploadConfig } from '@/composables/useUploadConfig'
import { useFileUpload } from '@/composables/useFileUpload'
import { useClipboard } from '@/composables/useClipboard'
import { useSettings } from '@/composables/useSettings'

// 工具导入
import { useWordStore } from '@/stores'
import { Utils } from '@/utils'

// ===================
// Composable逻辑组合
// ===================
const wordStore = useWordStore()

// 上传配置管理
const { fetchConfig, maxFiles, maxTotalSize } = useUploadConfig()

// 文件上传管理
const {
  fileList,
  uploadLoading,
  uploadStates,
  remainingUploadSpace,
  usedSpace,
  canUpload,
  fileTabLabel,
  fetchFileList,
  uploadFile,
  cancelUpload,
  deleteFile,
  downloadFile,
} = useFileUpload()

// 剪贴板管理
const {
  loading,
  keyword,
  showPasswordDialog,
  readOnlyLink,
  formatDate,
  fetchContent,
  saveContent,
  deleteContent,
  handlePasswordVerified,
  createAutoSave,
  copyReadOnlyLink,
} = useClipboard()

// 设置管理
const {
  showSettings,
  password,
  expiry,
  loading: settingsLoading,
  openSettings,
  closeSettings,
  saveSettings,
  getExpiryOptions,
} = useSettings()

// ===================
// 本地状态
// ===================
const viewMode = ref(true)
const activeTab = ref('clipboard')

// ===================
// 防抖自动保存
// ===================
const autoSave = createAutoSave(1000)

// ===================
// 事件处理函数
// ===================
const handleFileUpload = async (options: UploadRequestOptions) => {
  try {
    await uploadFile(options.file as File)

    // 如果是新的word，需要先创建keyword记录
    if (!keyword.value.id) {
      await saveContent(true)
    }

    await fetchFileList()
  } catch (error) {
    console.error('文件上传失败:', error)
  }
}

const handleFileDelete = async (fileName: string) => {
  try {
    // 显示确认对话框
    await ElMessageBox.confirm(`确定要删除文件 "${fileName}" 吗？此操作不可恢复。`, '确认删除', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
      dangerouslyUseHTMLString: false,
      cancelButtonClass: 'el-button--default',
      confirmButtonClass: 'el-button--danger',
    })

    // 用户确认后执行删除
    await deleteFile(fileName)
    await fetchContent() // 刷新页面数据
  } catch (error) {
    // 用户取消删除或删除失败
    if (error === 'cancel') {
      console.log('用户取消删除操作')
      return
    }
    console.error('删除文件失败:', error)
  }
}

const handleDeleteAllFiles = async () => {
  if (fileList.value.length === 0) return

  try {
    // 显示确认对话框
    await ElMessageBox.confirm(
      `确定要删除所有 ${fileList.value.length} 个文件吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: false,
        cancelButtonClass: 'el-button--default',
        confirmButtonClass: 'el-button--danger',
      }
    )

    // 批量删除所有文件
    const deletePromises = fileList.value.map((file) => deleteFile(file.name))
    await Promise.all(deletePromises)

    // 刷新页面数据
    await fetchContent()
    console.log(`成功删除 ${fileList.value.length} 个文件`)
  } catch (error) {
    // 用户取消删除或删除失败
    if (error === 'cancel') {
      console.log('用户取消删除操作')
      return
    }
    console.error('批量删除文件失败:', error)
  }
}

const handleFileDownload = async (fileName: string) => {
  try {
    await downloadFile(fileName)
  } catch (error) {
    console.error('下载文件失败:', error)
  }
}

const handleDelete = async () => {
  try {
    // 显示确认对话框
    await ElMessageBox.confirm(
      '确定要删除所有数据吗？包括剪贴板内容和所有文件，此操作不可恢复。',
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error',
        dangerouslyUseHTMLString: false,
        cancelButtonClass: 'el-button--default',
        confirmButtonClass: 'el-button--danger',
      }
    )

    // 用户确认后执行删除
    await deleteContent()
  } catch (error) {
    // 用户取消删除或删除失败
    if (error === 'cancel') {
      console.log('用户取消删除操作')
      return
    }
    console.error('删除内容失败:', error)
  }
}

const handleOpenSettings = () => {
  openSettings(password.value, keyword.value.expire_value)
}

const handleSettingsSave = async () => {
  try {
    await saveSettings()
    await fetchContent() // 重新加载数据获取更新后的expire_time
  } catch (error) {
    console.error('保存设置失败:', error)
  }
}

const handleRetry = async (fileName: string) => {
  const state = uploadStates.value.get(fileName)
  if (state?.currentFile) {
    const file = state.currentFile
    await handleFileUpload({ file } as UploadRequestOptions)
  }
}

/**
 * 手动关闭上传进度显示
 */
const handleDismissUpload = (fileName: string) => {
  uploadStates.value.delete(fileName)
}

// ===================
// 生命周期
// ===================
onMounted(async () => {
  // 初始化配置
  await fetchConfig()

  // 加载内容和文件
  await fetchContent()
  await fetchFileList()

  // 设置查看模式
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
            <div class="file-header upload-area">
              <div class="upload-info">
                <el-upload
                  v-if="uploadStates.size === 0"
                  :http-request="handleFileUpload"
                  :disabled="!canUpload"
                  :drag="true"
                  class="upload-dragger"
                >
                  <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
                  <div class="el-upload__text">
                    将文件拖到此处，或<em>点击上传</em>
                  </div>
                  <div class="upload-info-text">
                    <div class="upload-limit-info">
                      最多上传 {{ maxFiles }} 个文件，单文件最大 {{ Utils.humanReadableSize(maxTotalSize) }}
                    </div>
                    <div class="upload-space-info" v-if="!viewMode">
                      已用空间: {{ Utils.humanReadableSize(usedSpace) }} / {{ Utils.humanReadableSize(maxTotalSize) }}
                    </div>
                  </div>
                </el-upload>
                <UploadProgress
                  v-else
                  :upload-states="uploadStates"
                  @retry="handleRetry"
                  @cancel="cancelUpload"
                  @dismiss="handleDismissUpload"
                />
              </div>
            </div>

            <!-- 文件操作栏 -->
            <div v-if="fileList.length > 0 && !viewMode" class="file-actions-bar">
              <div class="file-stats">
                共 {{ fileList.length }} 个文件，{{ Utils.humanReadableSize(usedSpace) }}
              </div>
              <el-button
                type="danger"
                size="small"
                :icon="Delete"
                @click="handleDeleteAllFiles"
                plain
              >
                全部删除
              </el-button>
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
              <el-table-column label="操作" fixed="right" align="center" width="120">
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

        <div class="operation" v-if="keyword.id">
          <div class="qrcode">
            <div class="qrcode-label">只读链接</div>
            <div class="qrcode-content" @click="copyReadOnlyLink">
              <QRCode :data="readOnlyLink" :size="150" />
              <div class="copy-link">点击复制只读链接</div>
            </div>
          </div>
          <div class="info">
            <div class="info-item">
              <div class="label">口令:</div>
              <div class="value">{{ keyword.view_word }}</div>
            </div>
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
              v-for="option in getExpiryOptions()"
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

.operation {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-large);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  .info-item {
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 0;
    justify-content: center;
    gap: var(--spacing-small);
  }

  .info-item .label {
    width: auto;
  }
}

.qrcode {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  position: relative;
}

.qrcode-content {
  width: 150px;
  height: 150px;
  cursor: pointer;
  background-color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;

  .copy-link {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    opacity: 0;
    transition: opacity 0.3s ease;
    font-size: 14px;
    padding: 10px;
    box-sizing: border-box;
    pointer-events: none;
  }

  &:hover .copy-link {
    opacity: 1;
    pointer-events: auto;
  }
}

.qrcode-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-small);
}

.info {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.info-item {
  margin-bottom: 10px;
}

.file-header {
  margin-bottom: var(--spacing-large);
}

.upload-area {
  position: relative;
}

.upload-info {
  width: 100%;
  height: var(--upload-area-height, 245px); /* Configurable and consistent height */
  transition: height 0.3s ease-in-out;
  border-radius: 6px;
  overflow: hidden; /* Ensure children conform to border-radius */
}

.upload-info :deep(.el-upload),
.upload-info :deep(.el-upload-dragger) {
  width: 100%;
  height: 100%;
}

.upload-info :deep(.el-upload-dragger) {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.upload-dragger {
  width: 100% !important;
}

.upload-info-text {
  margin-top: 16px;
  text-align: center;
}

.upload-limit-info {
  color: var(--text-secondary);
  font-size: var(--font-size-small);
  margin-bottom: 6px;
  line-height: 1.4;
}

.upload-space-info {
  color: var(--text-primary);
  font-size: var(--font-size-small);
  font-weight: 500;
  line-height: 1.4;
}

.filename-cell {
  display: inline-block;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 文件操作栏样式 */
.file-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-small) var(--spacing-medium);
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  margin-bottom: var(--spacing-medium);
}

.file-stats {
  color: var(--text-secondary);
  font-size: var(--font-size-small);
  font-weight: 500;
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

.upload-area :deep(.el-upload-dragger) {
  transition: all 0.3s ease-in-out;
}

.upload-area :deep(.el-upload.is-uploading .el-upload-dragger) {
  height: auto;
  min-height: 180px; /* Match default height for seamless transition start */
  padding: 24px 0;
  border-style: solid;
  border-color: var(--el-border-color); /* Use a standard border color */
  background-color: var(--el-fill-color-lightest); /* A very subtle background change */
}

.filename-cell {
  display: inline-block;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
