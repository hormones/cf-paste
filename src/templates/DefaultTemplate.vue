<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { dataApi } from '../api/data'
import { fileApi } from '../api/file'
import type { Keyword, FileInfo } from '../types'
import { useWordStore } from '@/stores'
import { Utils } from '@/utils'
import { FILE_UPLOAD_LIMITS } from '@/types'
import type { UploadRequestOptions } from 'element-plus'

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

// 计算剩余有效期
const remainingTime = computed(() => {
  if (!keyword.value.expire_time) return ''
  const remaining = keyword.value.expire_time - Date.now()
  if (remaining <= 0) return '已过期'
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000))
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
  return `${days}天${hours}小时${minutes}分钟`
})

// 计算剩余可上传空间
const remainingUploadSpace = computed(() => {
  const currentSize = fileList.value.reduce((sum, file) => sum + file.size, 0)
  return FILE_UPLOAD_LIMITS.MAX_TOTAL_SIZE - currentSize
})

// 获取内容和文件列表
const fetchContent = async () => {
  loading.value = true
  try {
    const [data, files] = await Promise.all([dataApi.getKeyword(), fileApi.getFileList()])
    if (data) {
      keyword.value = data
      password.value = data.password || ''
    }
    fileList.value = files || []
  } catch (_error: any) {
    ElMessage.error('获取内容失败')
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
    fileList.value = []
  } catch (_error: any) {
    ElMessage.error('删除失败')
  }
}

// 添加文件下载处理函数
const handleFileDownload = async (fileName: string) => {
  const url = await fileApi.downloadFile(fileName)
  window.location.href = url
}

// 页面加载时获取数据
fetchContent()

// Add this computed property in the script section
const qrCodeUrl = computed(() => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(document.location.href)}`
})
</script>

<template>
  <div class="paste-container">
    <div class="header">
      <div class="left">
        <div class="input-group">
          <el-select v-model="expiry" placeholder="选择有效期" style="width: 120px">
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
            style="width: 200px"
          />
        </div>
      </div>
      <div class="right">
        <span class="time-info">{{ remainingTime }}</span>
        <el-button-group>
          <el-button type="danger" plain @click="handleDelete"> 删除 </el-button>
          <el-button type="primary" @click="handleSave" :loading="loading"> 保存 </el-button>
        </el-button-group>
        <div class="divider"></div>
        <slot name="template-selector" />
      </div>
    </div>

    <div class="main-content">
      <div class="tabs-container">
        <el-tabs>
          <el-tab-pane label="剪贴板文本">
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
              <el-table-column prop="name" label="文件名">
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
              <el-table-column prop="size" label="大小" width="120">
                <template #default="{ row }">
                  {{ Utils.humanReadableSize(row.size) }}
                </template>
              </el-table-column>
              <el-table-column prop="uploaded" label="上传时间" width="180">
                <template #default="{ row }">
                  {{ new Date(row.uploaded).toLocaleString() }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="180" fixed="right">
                <template #default="{ row }">
                  <el-button-group>
                    <el-button type="primary" link @click="handleFileDownload(row.name)">
                      下载
                    </el-button>
                    <el-button type="danger" link @click="handleFileDelete(row.name)">
                      删除
                    </el-button>
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
  </div>
</template>

<style scoped>
.paste-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  background: #fff;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px 20px;
  background: #f8f9fa;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}

.main-content {
  display: flex;
  gap: 20px;
  margin-top: 20px;
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

/* 美化输入框和标��页 */
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
