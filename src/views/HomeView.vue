<script setup lang="ts">
import { shallowRef } from 'vue'
import type { Component } from 'vue'
import Template from '@/templates/DefaultTemplate.vue'

const currentTemplate = shallowRef<Component>(Template)
</script>

<template>
  <Suspense>
    <template #default>
      <main>
        <component
          :is="currentTemplate"
          v-if="currentTemplate"
        />
      </main>
    </template>
    <template #fallback>
      <div class="loading">加载中...</div>
    </template>
  </Suspense>
</template>

<style scoped>
.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  font-size: 1.2em;
  color: #666;
}
</style>
