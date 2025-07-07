<template>
  <div class="file-table-container">
    <el-table :data="appStore.fileList" style="width: 100%" height="100%" empty-text="暂无文件">
      <el-table-column prop="name" label="文件名" min-width="180">
        <template #default="{ row }">
          <div class="file-name-cell">
            <span class="file-name-text">{{ row.name }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="size" label="大小" width="120">
        <template #default="{ row }">
          {{ Utils.humanReadableSize(row.size) }}
        </template>
      </el-table-column>
      <el-table-column prop="uploaded" label="创建时间" width="180">
        <template #default="{ row }">
          {{ new Date(row.uploaded).toLocaleString() }}
        </template>
      </el-table-column>
      <el-table-column label="操作" fixed="right" align="center" width="100">
        <template #default="{ row }">
          <el-button
            class="action-btn"
            type="primary"
            :icon="Download"
            @click="handleFileDownload(row)"
            text
          />
          <el-button
            class="action-btn"
            v-if="!appStore.viewMode"
            type="danger"
            :icon="Delete"
            @click="handleFileDelete(row)"
            text
          />
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ElMessageBox } from 'element-plus'
import { Download, Delete } from '@element-plus/icons-vue'
import { useFileUpload } from '@/composables/useFileUpload'
import type { FileInfo } from '@/types'
import { fileApi } from '@/api/file'
import { useAppStore } from '@/stores'
import { Utils } from '@/utils'

const emit = defineEmits(['delete-success'])

const { deleteFile } = useFileUpload()
const appStore = useAppStore()

const handleFileDownload = async (file: FileInfo) => {
  fileApi.download(file.name)
}

const handleFileDelete = async (file: FileInfo) => {
  try {
    await ElMessageBox.confirm(`确定要删除文件 ${file.name} 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteFile(file.name)
  } catch (error) {
    // ElMessageBox.confirm会处理取消操作的异常，这里无需额外处理
  }
}
</script>

<style scoped>
.el-button.action-btn {
  padding: 4px;
}
</style>
