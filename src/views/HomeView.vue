<script setup lang="ts">
import Template from '@/templates/DefaultTemplate.vue'

function dismissLoading() {
  const el = document.getElementById('app-loading')
  if (!el) return
  el.classList.add('fade-out')
  el.addEventListener('transitionend', () => el.remove(), { once: true })
}
</script>

<template>
  <main>
    <Template @ready="dismissLoading" />
  </main>
</template>
