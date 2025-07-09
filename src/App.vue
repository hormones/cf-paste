<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ElConfigProvider } from 'element-plus'
import { useAppStore } from '@/stores'
import ElementLocaleProvider from '@/components/ElementLocaleProvider.vue'

// Initialize theme management
const appStore = useAppStore()
appStore.initTheme()
</script>

<template>
  <ElementLocaleProvider>
    <el-config-provider :size="'small'" :z-index="3000">
      <RouterView />
    </el-config-provider>
  </ElementLocaleProvider>
</template>

<style scoped>
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
  'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
}
</style>
