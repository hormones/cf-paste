<script setup lang="ts">
import { onMounted } from 'vue'

// 组件导入
import PageHeader from '@/components/PageHeader.vue'
import PasswordDialog from '@/components/PasswordDialog.vue'
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
    <PageHeader />

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

    <!-- 设置对话框: 使用 ElDialog 和 ElForm 重构 -->
    <el-dialog
      v-model="appStore.showSettings"
      title="设置"
      width="420px"
      :append-to-body="true"
      :close-on-click-modal="false"
      @close="closeSettings"
    >
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="过期时间">
          <el-select v-model="appStore.expiry" placeholder="选择有效期" style="width: 100%">
            <el-option
              v-for="option in appStore.getExpiryOptions()"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="访问密码">
          <el-input
            v-model="appStore.password"
            placeholder="输入新密码或留空表示无密码"
            show-password
            clearable
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeSettings">取消</el-button>
          <el-button type="primary" @click="saveSettings">保存设置</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 用于显示二维码的对话框，同样使用 ElDialog -->
    <el-dialog
      v-model="appStore.showQRCodeDialog"
      width="360px"
      :show-header="false"
      :append-to-body="true"
      custom-class="qr-code-dialog"
    >
      <QRCodePanel />
    </el-dialog>
  </div>
</template>

<style scoped>
.paste-container {
  /* 容器样式 */
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  /* 使用 body 的背景色，这里不需要额外设置 */
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
  gap: 20px;
}

/* 设置对话框样式 - ElDialog 和 ElForm 自带样式，无需自定义 */
</style>

<style>
/* 针对二维码弹窗的全局样式，移除默认内边距并使其背景透明 */
.qr-code-dialog .el-dialog__body {
  padding: 0;
}
.qr-code-dialog {
  background: transparent;
  box-shadow: none;
}
</style>
