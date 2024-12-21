<script setup lang="ts">
import { useWordStore } from '@/stores'
import { storeToRefs } from 'pinia'

const store = useWordStore()
const { word } = storeToRefs(store)
</script>

<template>
  <div class="default-template">
    <header class="header">
      <h1>CF-Paste</h1>
      <p class="subtitle">安全、快速的文本分享工具</p>
    </header>

    <main class="content">
      <div class="word-display">
        <h2>当前 Word</h2>
        <div class="word-value">{{ word }}</div>
      </div>

      <div class="features">
        <el-card class="feature-card">
          <template #header>
            <h3>文本分享</h3>
          </template>
          <p>支持markdown格式</p>
        </el-card>

        <el-card class="feature-card">
          <template #header>
            <h3>文件上传</h3>
          </template>
          <p>支持任意格式文件</p>
        </el-card>
      </div>
    </main>
  </div>
</template>

<style scoped>
.default-template {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 40px;
}

.subtitle {
  color: #666;
  margin-top: 10px;
}

.word-display {
  text-align: center;
  margin-bottom: 40px;
}

.word-value {
  font-size: 24px;
  color: #409EFF;
  margin-top: 10px;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.feature-card {
  transition: transform 0.3s;
}

.feature-card:hover {
  transform: translateY(-5px);
}
</style>
