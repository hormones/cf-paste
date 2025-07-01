<template>
  <el-card class="info-card" shadow="never">
    <template #header>
      <el-text tag="b">基本信息</el-text>
    </template>

    <el-descriptions :column="1" border size="small">
      <el-descriptions-item label="创建时间">
        {{ formatDate(keyword.create_time) }}
      </el-descriptions-item>

      <el-descriptions-item label="更新时间">
        {{ formatDate(keyword.update_time) }}
      </el-descriptions-item>

      <el-descriptions-item label="上次查看">
        {{ formatDate(keyword.last_view_time) }}
      </el-descriptions-item>

      <el-descriptions-item label="过期时间">
        {{ formatDate(keyword.expire_time) }}
      </el-descriptions-item>

      <el-descriptions-item label="查看次数">
        {{ !keyword.id ? '-' : (keyword.view_count || 0) + '次' }}
      </el-descriptions-item>
    </el-descriptions>
  </el-card>
</template>

<script setup lang="ts">
import type { Keyword } from '@/types'

const props = defineProps<{
  keyword: Keyword
}>()

/**
 * 格式化时间戳为可读的日期时间字符串
 */
const formatDate = (timestamp?: number): string => {
  if (!timestamp) {
    return '-'
  }
  return new Date(timestamp).toLocaleString()
}
</script>

<style scoped>
.info-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

:deep(.el-descriptions__label) {
  font-weight: 500;
  color: var(--el-text-color-regular);
}

:deep(.el-descriptions__content) {
  color: var(--el-text-color-primary);
}
</style>
