<template>
  <el-config-provider :locale="currentElementLocale">
    <slot />
  </el-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElConfigProvider } from 'element-plus'
import { useI18n } from '../i18n'
import enLocale from 'element-plus/es/locale/lang/en'
import zhCnLocale from 'element-plus/es/locale/lang/zh-cn'

const { getCurrentLanguage } = useI18n()

// Element Plus language mapping
const elementLocaleMap = {
  'en': enLocale,
  'zh-CN': zhCnLocale
}

// Reactively compute current Element Plus language pack
const currentElementLocale = computed(() => {
  const currentLanguage = getCurrentLanguage()
  return elementLocaleMap[currentLanguage] || enLocale
})
</script>
