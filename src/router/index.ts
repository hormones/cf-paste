import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { Utils } from '@/utils'
import { useAppStore } from '@/stores'
import { MARKDOWN_MODE } from '@/constant'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'root',
      component: HomeView,
      beforeEnter: (to, from, next) => {
        next(`/${Utils.getRandomWord()}`)
      },
    },
    {
      path: '/v/:view_word',
      name: 'view_word',
      component: HomeView,
      beforeEnter: (to, from, next) => {
        const store = useAppStore()
        store.updateKeywordFields({ view_word: to.params.view_word as string })
        store.setViewMode(true)
        store.setMarkdownMode(MARKDOWN_MODE.PREVIEW)
        next()
      },
    },
    {
      // Catch all other paths
      path: '/:pathMatch(.*)*',
      name: 'home',
      component: HomeView,
      beforeEnter: (to, from, next) => {
        const store = useAppStore()
        const word = to.path.slice(1) // Remove leading /
        // If word is invalid, redirect to random word
        if (!Utils.isValidWord(word)) {
          next(`/${Utils.getRandomWord()}`)
          return
        }
        // Set new word
        store.updateKeywordFields({ word: word })
        store.setViewMode(false)
        store.setMarkdownMode(MARKDOWN_MODE.EDIT)
        next()
      },
    },
  ],
})
export default router
