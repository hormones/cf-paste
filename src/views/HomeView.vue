<script setup lang="ts">
import { useWordStore } from '@/stores'

const store = useWordStore()
</script>

<template>
  <main>
    <h1>当前 Word: {{ store.word }}</h1>
  </main>
</template>
