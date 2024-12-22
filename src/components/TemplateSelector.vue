<script setup lang="ts">
import { type Component, watch } from 'vue'
import { ElSelect, ElOption } from 'element-plus'
import { TEMPLATES, type TemplateKey } from '@/config/templates'

const model = defineModel<TemplateKey>()

const emit = defineEmits<{
  'template-loaded': [component: Component]
}>()

// 加载模板
const loadTemplate = async (templateId: TemplateKey) => {
  try {
    const module = await TEMPLATES[templateId].component()
    emit('template-loaded', module.default)
  } catch (error) {
    console.error('Failed to load template:', error)
  }
}

// 监听模板变化
watch(model, (value = 'default') => {
  if (value) {
    localStorage.setItem('template', value)
    loadTemplate(value)
  }
}, { immediate: true })
</script>

<template>
  <div class="template-selector">
    <el-select
      v-model="model"
      placeholder="选择模板"
      style="width: 120px"
    >
      <el-option
        v-for="[id, tpl] of Object.entries(TEMPLATES)"
        :key="id"
        :label="tpl.name"
        :value="id"
      />
    </el-select>
  </div>
</template>

<style scoped>
.template-selector {
  display: inline-block;
}
</style>
