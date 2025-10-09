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

<style>
/* Global tooltip styles to ensure they're never clipped */
.el-popper.is-light,
.el-popper.is-dark {
  z-index: 9999 !important;
}

/* Ensure tooltip containers don't get clipped by overflow */
body > .el-popper {
  z-index: 9999 !important;
}
</style>
