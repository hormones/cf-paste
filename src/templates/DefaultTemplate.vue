<script setup lang="ts">
/**
 * 默认模板组件 - Pinia-first 重构版
 * 使用统一的 Store 管理状态，Composables 只负责业务逻辑
 */
import { ref, computed, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'

// 组件导入
import PasswordDialog from '@/components/PasswordDialog.vue'
import GlassDialog from '@/components/GlassDialog.vue'
import TabsContainer from '@/components/TabsContainer.vue'
import ClipboardPanel from '@/components/ClipboardPanel.vue'
import FileUploadPanel from '@/components/FileUploadPanel.vue'
import FileTable from '@/components/FileTable.vue'
import InfoPanel from '@/components/InfoPanel.vue'
import QRCodePanel from '@/components/QRCodePanel.vue'

// Store 和 Composable 导入
import { useAppStore, useWordStore } from '@/stores'
import { useClipboard } from '@/composables/useClipboard'
import { useFileUpload } from '@/composables/useFileUpload'
import { useSettings } from '@/composables/useSettings'

// ===================
// Store 和 Composables
// ===================
const appStore = useAppStore()
const wordStore = useWordStore()

// 业务逻辑 Composables
const {
  fetchContent,
  saveContent,
  deleteContent,
  handlePasswordVerified
} = useClipboard()

const {
  fetchConfig,
  fetchFileList
} = useFileUpload()

const {
  openSettings,
  closeSettings,
  saveSettings,
} = useSettings()

// ===================
// 本地状态和计算属性
// ===================
const activeTab = ref('clipboard')

// 视图模式计算属性
const viewMode = computed(() => !wordStore.word)

// ===================
// 事件处理函数
// ===================

// 创建自动保存函数
const autoSave = () => {
  if (appStore.hasUnsavedChanges) {
    saveContent()
  }
}

const handleDelete = async () => {
  try {
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

    await deleteContent()

    // 删除成功后重置文件列表和上传状态
    appStore.setFileList([])
    appStore.clearUploadStates()
  } catch (error) {
    if (error === 'cancel') {
      console.log('用户取消删除操作')
      return
    }
    console.error('删除内容失败:', error)
  }
}

const handleOpenSettings = () => {
  openSettings()
}

const handleSettingsSave = async () => {
  try {
    await saveSettings()
    const keywordData = await fetchContent()
    if (keywordData) {
      await fetchFileList()
    }
  } catch (error) {
    console.error('保存设置失败:', error)
  }
}

const handleUploadSuccess = async () => {
  // 如果是新的word，需要先创建keyword记录
  if (!appStore.keyword.id) {
    await saveContent()
  }
  // 刷新文件列表
  await fetchFileList()
}

const handlePasswordVerifiedAndFetchFiles = async () => {
  await handlePasswordVerified()
  const keywordData = await fetchContent()
  if (keywordData) {
    await fetchFileList()
  }
}

const handleFileDeleteSuccess = async () => {
  await fetchContent()
  await fetchFileList()
}

// ===================
// 生命周期
// ===================
onMounted(async () => {
  // 初始化配置
  await fetchConfig()

  // 加载内容
  const keywordData = await fetchContent()
  // 如果存在keyword，才加载文件列表
  if (keywordData) {
    await fetchFileList()
  }

  // 在只读模式下，如果剪贴板为空但文件列表不为空，则默认显示文件tab
  if (viewMode.value && !appStore.keyword.content && appStore.fileList.length > 0) {
    activeTab.value = 'files'
  }
})
</script>

<template>
  <div class="paste-container">
    <!-- 使用 el-row/el-col 替代自定义布局 -->
    <el-row :gutter="20" class="main-layout">
      <el-col :span="viewMode ? 24 : 16" :xs="24" :sm="24" :md="viewMode ? 24 : 16">
        <TabsContainer
          v-model:active-tab="activeTab"
          :file-tab-label="appStore.fileTabLabel"
          :view-mode="viewMode"
          :show-file-tab="!(viewMode && appStore.fileList.length === 0)"
          :show-clipboard-tab="!(viewMode && !appStore.keyword.content)"
          @delete="handleDelete"
          @open-settings="handleOpenSettings"
        >
          <template #clipboard>
            <ClipboardPanel
              v-model="appStore.keyword.content"
              :view-mode="viewMode"
              @request-auto-save="autoSave"
            />
          </template>

          <template #files>
            <div class="layout-flex">
                              <FileUploadPanel v-if="!viewMode" @upload-success="handleUploadSuccess" />
              <FileTable
                :view-mode="viewMode"
                :file-list="appStore.fileList"
                @delete-success="handleFileDeleteSuccess"
              />
            </div>
          </template>
        </TabsContainer>
      </el-col>

      <el-col :span="8" :xs="0" :sm="0" :md="8" v-if="!viewMode">
        <el-space direction="vertical" size="large" fill>
          <InfoPanel :keyword="appStore.keyword" />
          <QRCodePanel :keyword="appStore.keyword" />
        </el-space>
      </el-col>
    </el-row>

    <PasswordDialog
      v-model="appStore.showPasswordDialog"
      @verified="handlePasswordVerifiedAndFetchFiles"
    />

    <!-- 设置对话框 -->
    <GlassDialog v-model:visible="appStore.showSettings" title="设置" size="small" width="420px">
      <div class="settings-content">
        <div class="setting-group">
          <label class="setting-label">过期时间</label>
          <el-select v-model="appStore.expiry" placeholder="选择有效期" style="width: 100%">
            <el-option
              v-for="option in appStore.getExpiryOptions()"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>

                <div class="setting-group">
          <label class="setting-label">访问密码</label>
          <el-input
            v-model="appStore.password"
            placeholder="输入新密码或留空表示无密码"
            show-password
            clearable
          />
        </div>
      </div>

      <template #footer>
        <el-button @click="closeSettings">取消</el-button>
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

/* 主要布局使用Element Plus的el-row/el-col，无需自定义样式 */
.main-layout {
  max-width: 1400px;
  margin: 0 auto;
}

/* Info面板和Operation已用Element的el-card和el-descriptions替代 */

/* 文件上传和表格相关样式已移到各自组件中 */

/* 保留必要的业务样式 - 文件名截断 */
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

/* Element组件样式微调 */
:deep(.el-button) {
  height: 40px;
  padding: 0 var(--spacing-large);
}

/* 文件标签页的布局样式 - 现在由全局CSS处理，这里可以移除 */

/* 移动端样式 - Element的el-row/el-col自动处理响应式 */
@media (max-width: 768px) {
  .paste-container {
    padding: var(--spacing-small);
  }
}
</style>
