<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useAppStore } from '@/stores'
import ElementLocaleProvider from '@/components/ElementLocaleProvider.vue'

// Initialize theme management
const appStore = useAppStore()
appStore.initTheme()
</script>

<template>
  <ElementLocaleProvider>
    <RouterView />
  </ElementLocaleProvider>
</template>
