<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { dataApi } from '../api/data'
import { Utils } from '../utils'
import type { Keyword } from '../types'
import { useWordStore } from '@/stores'

const wordStore = useWordStore()
const keyword = ref<Keyword>({
  word: wordStore.word,
  view_word: Utils.getRandomWord(10),
  content: '',
  // 默认过期时间：1周
  expire_time: Date.now() + 7 * 24 * 60 * 60 * 1000,
})
const loading = ref(false)
const saved = ref(false)
const origin = window.location.origin

// 获取剪切板内容
const fetchContent = async () => {
  loading.value = true
  try {
    const data = await dataApi.getKeyword()
    if (data) {
      keyword.value = data
    }
  } catch (error) {
    console.error('获取内容失败:', error)
  } finally {
    loading.value = false
  }
}

// 保存剪切板内容
const saveContent = async () => {
  if (!keyword.value.content) return
  loading.value = true
  try {
    const data: Keyword = {
      id: keyword.value.id,
      word: keyword.value.word,
      view_word: keyword.value.view_word,
      content: keyword.value.content,
      expire_time: keyword.value.expire_time,
    }

    if (keyword.value.id) {
      await dataApi.updateKeyword(data)
    } else {
      await dataApi.createKeyword(data)
    }
    saved.value = true
    setTimeout(() => {
      saved.value = false
    }, 2000)
  } catch (error) {
    console.error('保存失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchContent()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-2xl font-bold mb-4">剪切板</h1>

      <div class="mb-4">
        <textarea
          v-model="keyword.content"
          class="w-full h-64 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="在此粘贴内容..."
        />
      </div>

      <div class="flex justify-between items-center">
        <div class="text-sm text-gray-500">访问链接: {{ origin }}/{{ wordStore.word }}</div>
        <button
          @click="saveContent"
          :disabled="loading || !keyword.content"
          class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? '保存中...' : '保存' }}
        </button>
      </div>

      <div v-if="saved" class="mt-4 p-4 bg-green-100 text-green-700 rounded-lg text-center">
        保存成功！
      </div>
    </div>
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
  color: #409eff;
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
