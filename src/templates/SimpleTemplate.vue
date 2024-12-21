<script setup lang="ts">
import { useWordStore } from '@/stores'

const store = useWordStore()
</script>

<template>
  <div class="simple-template">
    <div class="word-container">
      <div class="word">{{ store.word }}</div>
      <div class="description">
        分享你的文本或文件
      </div>
    </div>
  </div>
</template>

<style scoped>
.simple-template {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f7fa;
}

.word-container {
  text-align: center;
}

.word {
  font-size: 48px;
  font-weight: 300;
  color: #409EFF;
  margin-bottom: 20px;
}

.description {
  color: #909399;
  font-size: 16px;
}
</style>
