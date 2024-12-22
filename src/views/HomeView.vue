<script setup lang="ts">
import { ref, shallowRef, onMounted } from 'vue'
import type { Component } from 'vue'
import type { TemplateKey } from '@/config/templates'
import TemplateSelector from '@/components/TemplateSelector.vue'
import { TEMPLATES } from '@/config/templates'

const templateId = ref<TemplateKey>((localStorage.getItem('template') || 'default') as TemplateKey)
const currentTemplate = shallowRef<Component>()

const handleTemplateLoaded = (component: Component) => {
  currentTemplate.value = component
}

// 初始加载默认模板
onMounted(async () => {
  const module = await TEMPLATES[templateId.value].component()
  currentTemplate.value = module.default
})
</script>

<template>
  <Suspense>
    <template #default>
      <main>
        <component
          :is="currentTemplate"
          v-if="currentTemplate"
        >
          <template #template-selector>
            <TemplateSelector
              v-model="templateId"
              @template-loaded="handleTemplateLoaded"
            />
          </template>
        </component>
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
