<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Delete } from '@element-plus/icons-vue'
import { dataApi } from '../api/data'
import { fileApi } from '../api/file'
import type { Keyword, FileInfo } from '../types'
import { useWordStore } from '@/stores'
import { Utils } from '@/utils'
import { FILE_UPLOAD_LIMITS } from '@/types'
import type { UploadRequestOptions } from 'element-plus'
import PasswordDialog from '@/components/PasswordDialog.vue'

const wordStore = useWordStore()

// 有效期选项
const expiryOptions = [
  { label: '1小时', value: 60 * 60 * 1000 },
  { label: '1天', value: 24 * 60 * 60 * 1000 },
  { label: '3天', value: 3 * 24 * 60 * 60 * 1000 },
  { label: '1周', value: 7 * 24 * 60 * 60 * 1000 },
  { label: '1个月', value: 30 * 24 * 60 * 60 * 1000 },
  { label: '3个月', value: 90 * 24 * 60 * 60 * 1000 },
]

const keyword = ref<Keyword>({
  word: wordStore.word,
  view_word: Utils.getRandomWord(6),
  content: '',
  expire_time: expiryOptions[2].value + Date.now(), // 默认3天
})

const loading = ref(false)
const fileList = ref<FileInfo[]>([])
const uploadLoading = ref(false)
const password = ref('')
const expiry = ref(expiryOptions[2].value)
const showPasswordDialog = ref(false)
const newWord = ref<boolean>(true)

// 计算剩余可上传空间
const remainingUploadSpace = computed(() => {
  const currentSize = fileList.value.reduce((sum, file) => sum + file.size, 0)
  return FILE_UPLOAD_LIMITS.MAX_TOTAL_SIZE - currentSize
})

// 获取内容和文件列表
const fetchContent = async () => {
  loading.value = true
  try {
    const data = await dataApi.getKeyword()
    if (data) {
      newWord.value = false
      keyword.value = data
      password.value = data.password || ''
      const files = await fileApi.getFileList()
      fileList.value = files || []
    }
  } catch (response: any) {
    // 如果是403错误，说明需要密码
    if (response?.status === 403) {
      showPasswordDialog.value = true
    } else {
      ElMessage.error('获取内容失败')
    }
  } finally {
    loading.value = false
  }
}

// 添加防抖函数
const debounce = <T extends (...args: any[]) => any>(fn: T, delay: number) => {
  let timer: number | null = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// 修改保存函数，使其可以存
const handleSave = async (silent = false) => {
  if (!keyword.value.content && fileList.value.length === 0) {
    if (!silent) ElMessage.warning('请输入内容或上传文件')
    return
  }

  loading.value = true
  try {
    const data: Keyword = {
      id: keyword.value.id,
      word: keyword.value.word,
      view_word: keyword.value.view_word,
      content: keyword.value.content,
      password: password.value,
      expire_time: Date.now() + expiry.value,
      view_count: (keyword.value.view_count || 0) + 1,
    }

    if (keyword.value.id) {
      await dataApi.updateKeyword(data)
    } else {
      await dataApi.createKeyword(data)
    }
    if (!silent) ElMessage.success('保存成功')
    await fetchContent()
  } catch (_error: any) {
    if (!silent) ElMessage.error('保存失败')
  } finally {
    loading.value = false
  }
}

// 添加防抖的自动保存函数
const autoSave = debounce(() => handleSave(true), 1000)

// 修改文件上传处理函数
const handleFileUpload = async (file: File) => {
  uploadLoading.value = true
  try {
    await fileApi.uploadFile(file)
    ElMessage.success('上传成功')
    await fetchContent()
  } catch (error: any) {
    ElMessage.error(error?.message || '上传失败')
  } finally {
    uploadLoading.value = false
  }
}

// 删除文件
const handleFileDelete = async (fileName: string) => {
  try {
    await fileApi.deleteFile(fileName)
    ElMessage.success('删除成功')
    await fetchContent()
  } catch (_error: any) {
    ElMessage.error('删除失败')
  }
}

// 添加删除处理函数
const handleDelete = async () => {
  try {
    await dataApi.deleteKeyword()
    ElMessage.success('删除成功')
    // 重置表单
    keyword.value = {
      word: wordStore.word,
      view_word: Utils.getRandomWord(6),
      content: '',
      expire_time: expiryOptions[2].value + Date.now(),
    }
    password.value = ''
    fileList.value = []
    newWord.value = true
    wordStore.setViewWord(keyword.value.view_word)
    await fetchContent()
  } catch (_error: any) {
    ElMessage.error('删除失败')
  }
}

// 添加文件下载处理函数
const handleFileDownload = async (fileName: string) => {
  const url = await fileApi.downloadFile(fileName)
  window.value.location.href = url
}

// Add this computed property in the script section
const qrCodeUrl = computed(() => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(document.location.href)}`
})

const window = ref(globalThis.window)

// 监听窗口大小变化
const handleResize = () => {
  window.value = globalThis.window
}

// 添加密码验证成功的处理函数
const handlePasswordVerified = () => {
  fetchContent()
}

onMounted(async () => {
  globalThis.window.addEventListener('resize', handleResize)
  // 页面加载时获取数据
  await fetchContent()
  // 设置view_word
  wordStore.setViewWord(keyword.value.view_word!)
})

onUnmounted(() => {
  globalThis.window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="paste-container">
    <div class="header">
      <div class="header-content">
        <div class="input-group">
          <el-select v-model="expiry" placeholder="选择有效期" class="expiry-select">
            <el-option
              v-for="option in expiryOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <el-input
            v-model="password"
            placeholder="密码(可选)"
            show-password
            class="password-input"
          />
        </div>
        <div class="action-group">
          <el-button-group>
            <el-button type="danger" plain @click="handleDelete"> 删除 </el-button>
            <el-button type="primary" @click="handleSave" :loading="loading"> 保存 </el-button>
          </el-button-group>
          <div class="divider"></div>
          <slot name="template-selector" />
        </div>
      </div>
    </div>

    <div class="main-content">
      <div class="tabs-container">
        <el-tabs>
          <el-tab-pane label="剪贴板">
            <el-input
              v-model="keyword.content"
              type="textarea"
              :rows="15"
              placeholder="在此输入或粘贴内容..."
              resize="none"
              @blur="autoSave"
            />
          </el-tab-pane>
          <el-tab-pane :label="`文件(${fileList.length}个)`">
            <div class="file-header">
              <div class="upload-info">
                <el-upload
                  :auto-upload="true"
                  :show-file-list="false"
                  :http-request="(options: UploadRequestOptions) => handleFileUpload(options.file)"
                  :disabled="uploadLoading || fileList.length >= FILE_UPLOAD_LIMITS.MAX_FILES"
                >
                  <el-button
                    type="primary"
                    :loading="uploadLoading"
                    :disabled="uploadLoading || fileList.length >= FILE_UPLOAD_LIMITS.MAX_FILES"
                  >
                    {{ uploadLoading ? '上传中...' : '上传文件' }}
                  </el-button>
                </el-upload>
                <div class="upload-limits">
                  <div>最多上传 {{ FILE_UPLOAD_LIMITS.MAX_FILES }} 个文件</div>
                  <div>
                    已用空间:
                    {{
                      Utils.humanReadableSize(
                        FILE_UPLOAD_LIMITS.MAX_TOTAL_SIZE - remainingUploadSpace,
                      )
                    }}
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
              <el-table-column
                prop="uploaded"
                label="上传时间"
                min-width="120"
                v-if="window.innerWidth > 768"
              >
                <template #default="{ row }">
                  <span class="hide-on-mobile">
                    {{ new Date(row.uploaded).toLocaleString() }}
                  </span>
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
                      type="danger"
                      :icon="Delete"
                      @click="handleFileDelete(row.name)"
                      text
                    />
                  </el-button-group>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>

      <div class="side-panel">
        <div class="info-panel">
          <div class="info-item">
            <div class="label">创建时间:</div>
            <div class="value">
              {{ new Date(keyword.create_time || Date.now()).toLocaleString() }}
            </div>
          </div>
          <div class="info-item">
            <div class="label">更新时间:</div>
            <div class="value">
              {{ new Date(keyword.update_time || Date.now()).toLocaleString() }}
            </div>
          </div>
          <div class="info-item">
            <div class="label">上次查看:</div>
            <div class="value">
              {{ new Date(keyword.last_view_time || Date.now()).toLocaleString() }}
            </div>
          </div>
          <div class="info-item">
            <div class="label">过期时间:</div>
            <div class="value">
              {{ new Date(keyword.expire_time || Date.now()).toLocaleString() }}
            </div>
          </div>
          <div class="info-item">
            <div class="label">查看次数:</div>
            <div class="value">{{ keyword.view_count || 0 }}次</div>
          </div>
        </div>

        <div class="qrcode">
          <div class="qrcode-label">扫码查看</div>
          <el-image style="width: 150px; height: 150px" :src="qrCodeUrl" />
        </div>
      </div>
    </div>

    <PasswordDialog v-model="showPasswordDialog" @verified="handlePasswordVerified" />
  </div>
</template>

<style scoped>
.paste-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  background: #fff;
  backdrop-filter: blur(10px); /* 设置毛玻璃效果 */
}

.header {
  margin-bottom: 20px;
  background: #f8f9fa;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 15px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.input-group {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.expiry-select {
  width: 120px;
}

.password-input {
  width: 200px;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.main-content {
  display: flex;
  gap: 20px;
  margin-top: 20px;
  flex-direction: row;
}

@media (max-width: 768px) {
  .paste-container {
    padding: 10px;
  }

  .header {
    padding: 10px;
  }

  .main-content {
    flex-direction: column;
  }

  .side-panel {
    display: none;
  }

  .expiry-select,
  .password-input {
    width: 100%;
  }

  .hide-on-mobile {
    display: none;
  }

  .upload-info {
    flex-direction: column;
    align-items: flex-start !important;
  }

  .upload-limits {
    margin-top: 10px;
  }

  :deep(.el-table .cell) {
    padding: 8px !important;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
    white-space: nowrap;
  }

  :deep(.el-button) {
    height: 32px;
    padding: 0 8px;
    font-size: 13px;
  }

  .filename-cell {
    max-width: 160px;
  }
}

.tabs-container {
  flex: 1;
  min-width: 0;
  background: #f8f9fa;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
}

.side-panel {
  width: 300px;
  flex-shrink: 0;
}

.info-panel {
  background: #f8f9fa;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.qrcode {
  background: #f8f9fa;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

/* 美化输入框和标页 */
:deep(.el-tabs__header) {
  margin-bottom: 20px;
}

:deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: #e4e7ed;
}

:deep(.el-textarea__inner) {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 15px;
  background: #fff;
}

:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
  --el-table-border-color: #e4e7ed;
}

/* 统一边框和阴影效果 */
:deep(.el-input__wrapper),
:deep(.el-select__wrapper) {
  box-shadow: 0 0 0 1px #e4e7ed inset;
  border-radius: 4px;
}

.info-item {
  display: flex;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e4e7ed;
}

.info-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.info-item .label {
  width: 100px;
  color: #909399;
  font-size: 14px;
}

.info-item .value {
  color: #606266;
  font-size: 14px;
}

.qrcode-label {
  margin-bottom: 15px;
  color: #909399;
  font-size: 14px;
}

:deep(.el-button) {
  height: 40px;
  padding: 0 20px;
}

.time-info {
  margin-right: 20px;
  color: #606266;
  font-size: 14px;
}

.input-group {
  display: flex;
  gap: 15px;
  align-items: center;
}

.right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.divider {
  width: 1px;
  height: 24px;
  background-color: #e4e7ed;
  margin: 0 5px;
}

/* 移除多余的内边距 */
:deep(.el-tabs__content) {
  padding: 0;
}

.file-header {
  margin-bottom: 20px;
}

.upload-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.upload-limits {
  color: #909399;
  font-size: 12px;
}

.filename-cell {
  display: inline-block;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
