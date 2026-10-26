<script setup lang="ts">
import Template from '@/templates/DefaultTemplate.vue'

function dismissLoading() {
  const el = document.getElementById('app-loading')
  if (!el) return

  let removed = false
  const remove = () => {
    if (removed) return
    removed = true
    el.remove()
  }

  el.classList.add('fade-out')

  // `transitionend` is the fast path, but it is not guaranteed: browsers skip
  // transitions on backgrounded tabs, in reduced-motion mode, and some Android
  // in-app browsers never fire it at all. Without a fallback the overlay stays
  // in the DOM (invisible once faded, but still covering the viewport and
  // swallowing every tap), so always remove it on a timer as well.
  el.addEventListener('transitionend', remove, { once: true })
  setTimeout(remove, 600)
}
</script>

<template>
  <main>
    <Template @ready="dismissLoading" />
  </main>
</template>
