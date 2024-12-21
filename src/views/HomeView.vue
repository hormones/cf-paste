<script setup lang="ts">
import { ref } from 'vue'

const input = ref('')
const date = ref('')
const options = [
  {
    value: 'Option1',
    label: 'Option 1',
  },
  {
    value: 'Option2',
    label: 'Option 2',
  },
  {
    value: 'Option3',
    label: 'Option 3',
  },
]
const value = ref('')
const loading = ref(false)

const handleClick = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 2000)
}
</script>

<template>
  <div class="home">
    <h1>Element Plus Demo</h1>

    <div class="demo-container">
      <el-card class="demo-card">
        <template #header>
          <div class="card-header">
            <span>Input Components</span>
          </div>
        </template>

        <el-input v-model="input" placeholder="Please input" />

        <el-date-picker
          v-model="date"
          type="date"
          placeholder="Pick a date"
          class="mt-4"
        />

        <el-select v-model="value" placeholder="Select" class="mt-4">
          <el-option
            v-for="item in options"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-card>

      <el-card class="demo-card">
        <template #header>
          <div class="card-header">
            <span>Button Types</span>
          </div>
        </template>

        <div class="button-container">
          <el-button>Default</el-button>
          <el-button type="primary">Primary</el-button>
          <el-button type="success">Success</el-button>
          <el-button type="warning">Warning</el-button>
          <el-button type="danger">Danger</el-button>
        </div>

        <div class="button-container mt-4">
          <el-button :loading="loading" type="primary" @click="handleClick">
            Click me to load
          </el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.home {
  padding: 20px;
}

.demo-container {
  max-width: 800px;
  margin: 0 auto;
  display: grid;
  gap: 20px;
  padding: 20px 0;
}

.demo-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.button-container {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.mt-4 {
  margin-top: 16px;
}
</style>
