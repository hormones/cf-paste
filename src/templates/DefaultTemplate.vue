<script setup lang="ts">
import { onMounted } from 'vue'

// 组件导入
import PasswordDialog from '@/components/PasswordDialog.vue'
import GlassDialog from '@/components/GlassDialog.vue'
import TabsContainer from '@/components/TabsContainer.vue'
import InfoPanel from '@/components/InfoPanel.vue'
import QRCodePanel from '@/components/QRCodePanel.vue'

// Store 和 Composable 导入
import { useAppStore } from '@/stores'
import { useMain } from '@/composables/useMain'
import { useFileUpload } from '@/composables/useFileUpload'
import { useSettings } from '@/composables/useSettings'

// ===================
// Store 和 Composables
// ===================
const appStore = useAppStore()

// 业务逻辑 Composables
const { fetchKeyword } = useMain()

const { fetchConfig, fetchFileList } = useFileUpload()

const { closeSettings, saveSettings } = useSettings()

// ===================
// 事件处理函数
// ===================

onMounted(async () => {
  // 初始化配置
  await fetchConfig()

  // 加载内容
  const keywordData = await fetchKeyword()
  // 如果存在keyword，才加载文件列表
  if (keywordData) {
    await fetchFileList()
  }

  // 设置全局 viewMode
  appStore.viewMode = !appStore.keyword.word
})
</script>

<template>
  <div class="paste-container">
    <!-- 使用 el-row/el-col 替代自定义布局 -->
    <el-row :gutter="20" class="main-layout">
      <el-col
        :span="appStore.viewMode ? 24 : 16"
        :xs="24"
        :sm="24"
        :md="appStore.viewMode ? 24 : 16"
      >
        <TabsContainer />
      </el-col>
      <el-col :span="8" :xs="0" :sm="0" :md="8" v-if="!appStore.viewMode">
        <div class="side-panel">
          <InfoPanel />
          <QRCodePanel />
        </div>
      </el-col>
    </el-row>

    <PasswordDialog v-model:visible="appStore.showPasswordDialog" />

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
        <el-button type="primary" @click="saveSettings">保存设置</el-button>
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

/* 侧边栏样式 - 为基本信息和只读链接添加间距 */
.side-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-large); /* 使用CSS变量定义的间距 */
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
