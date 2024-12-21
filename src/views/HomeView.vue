<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import type { Component } from 'vue'
import type { TemplateKey } from '@/config/templates'
import TemplateSelector from '@/components/TemplateSelector.vue'

const templateId = ref<TemplateKey>((localStorage.getItem('template') || 'default') as TemplateKey)
const currentTemplate = shallowRef<Component>()

const handleTemplateLoaded = (component: Component) => {
  currentTemplate.value = component
}
</script>

<template>
  <Suspense>
    <template #default>
      <main>
        <TemplateSelector v-model="templateId" @template-loaded="handleTemplateLoaded" />
        <component :is="currentTemplate" />
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
