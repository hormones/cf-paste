import { createRouter, createWebHistory } from 'vue-router'
import { Utils } from '@/utils'
import { useAppStore } from '@/stores'
import { MARKDOWN_MODE } from '../constants'

// Note: Admin authentication is now handled in the component itself
// No need to check authentication in router since we use HttpOnly cookies

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/AdminDashboardView.vue'),
      // No beforeEnter guard needed - authentication is handled in the component
    },
    {
      path: '/',
      name: 'root',
      component: () => import('../views/HomeView.vue'),
      beforeEnter: (to, from, next) => {
        next(`/${Utils.getRandomWord()}`)
      },
    },
    {
      path: '/v/:view_word',
      name: 'view_word',
      component: () => import('../views/HomeView.vue'),
      beforeEnter: (to, from, next) => {
        const store = useAppStore()
        store.updateKeyword({ view_word: to.params.view_word as string })
        store.setViewMode(true)
        store.setMarkdownMode(MARKDOWN_MODE.PREVIEW)
        next()
      },
    },
    {
      // Catch all other paths
      path: '/:pathMatch(.*)*',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      beforeEnter: (to, from, next) => {
        const store = useAppStore()
        const word = to.path.slice(1) // Remove leading /
        // If word is invalid, redirect to random word
        if (!Utils.isValidWord(word)) {
          next(`/${Utils.getRandomWord()}`)
          return
        }
        // Set new word
        store.updateKeyword({ word: word })
        store.setViewMode(false)
        store.setMarkdownMode(MARKDOWN_MODE.EDIT)
        next()
      },
    },
  ],
})
export default router
