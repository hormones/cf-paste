<template>
  <template v-if="fileList.length > 0">
    <!-- 文件操作栏 -->
    <el-card v-if="!viewMode" class="layout-item file-actions-card" shadow="never">
      <div class="file-actions">
        <el-text type="info">
          共 {{ fileList.length }} 个文件，{{ humanReadableSize(usedSpace) }}
        </el-text>
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
    </el-card>

    <!-- 文件表格 -->
    <el-table :data="fileList" class="layout-item" stripe>
      <el-table-column prop="name" label="文件名" min-width="140">
        <template #default="{ row }">
          <el-tooltip :content="row.name" placement="top">
            <span class="filename-cell">{{ row.name }}</span>
          </el-tooltip>
        </template>
      </el-table-column>

      <el-table-column prop="size" label="大小" min-width="90">
        <template #default="{ row }">
          {{ humanReadableSize(row.size) }}
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
  </template>

  <!-- 空状态 -->
  <el-empty v-else description="暂无文件" class="layout-item" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Download, Delete } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { Utils } from '@/utils'
import { useFileUpload } from '@/composables/useFileUpload'
import type { FileInfo } from '@/types'

const props = defineProps<{
  viewMode: boolean
  fileList: FileInfo[]
}>()

const emit = defineEmits<{
  (e: 'delete-success'): void
}>()

// 只从 composable 中获取需要的方法，状态由 props 传入
const { deleteFile, downloadFile } = useFileUpload()

const usedSpace = computed(() => {
  return props.fileList.reduce((total, file) => total + file.size, 0)
})

// 内部处理删除单个文件
const handleFileDelete = async (fileName: string) => {
  try {
    // 显示确认对话框
    await ElMessageBox.confirm(`确定要删除文件 "${fileName}" 吗？此操作不可恢复。`, '确认删除', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // 用户确认后执行删除
    await deleteFile(fileName)
    emit('delete-success') // 向上通知父组件
  } catch (error) {
    // 用户取消删除或删除失败
    if (error === 'cancel') {
      return
    }
    console.error('删除文件失败:', error)
  }
}

// 内部处理批量删除文件
const handleDeleteAllFiles = async () => {
  if (props.fileList.length === 0) return

  try {
    // 显示确认对话框
    await ElMessageBox.confirm(
      `确定要删除所有 ${props.fileList.length} 个文件吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 批量删除所有文件
    const deletePromises = props.fileList.map((file) => deleteFile(file.name))
    await Promise.all(deletePromises)

    // 刷新页面数据
    emit('delete-success') // 向上通知父组件
  } catch (error) {
    // 用户取消删除或删除失败
    if (error === 'cancel') {
      return
    }
    console.error('批量删除文件失败:', error)
  }
}

// 内部处理文件下载
const handleFileDownload = async (fileName: string) => {
  try {
    await downloadFile(fileName)
  } catch (error) {
    console.error('下载文件失败:', error)
  }
}

const humanReadableSize = Utils.humanReadableSize
</script>

<style scoped>
.file-actions-card {
  margin-bottom: 16px;
}

.file-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filename-cell {
  display: inline-block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
