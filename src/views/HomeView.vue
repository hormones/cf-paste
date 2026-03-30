<script setup lang="ts">
import { shallowRef } from 'vue'
import type { Component } from 'vue'
import Template from '@/templates/DefaultTemplate.vue'

const currentTemplate = shallowRef<Component>(Template)

function onReady() {
  const el = document.getElementById('app-loading')
  if (!el) return
  el.classList.add('fade-out')
  el.addEventListener('transitionend', () => el.remove(), { once: true })
}
</script>

<template>
  <Suspense @resolve="onReady">
    <template #default>
      <main>
        <component
          :is="currentTemplate"
          v-if="currentTemplate"
        />
      </main>
    </template>
    <template #fallback>
      <!-- app-loading spinner in index.html covers this phase -->
    </template>
  </Suspense>
</template>
