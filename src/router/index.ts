import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { Utils } from '@/utils'
import { useAppStore } from '@/stores'

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
        next()
      },
    },
    {
      // 捕获其它所有路径
      path: '/:pathMatch(.*)*',
      name: 'home',
      component: HomeView,
      beforeEnter: (to, from, next) => {
        const store = useAppStore()
        const word = to.path.slice(1) // 移除开头的 /
        // 如果word无效，重定向到随机word
        if (!Utils.isValidWord(word)) {
          next(`/${Utils.getRandomWord()}`)
          return
        }
        // 设置新的word
        store.updateKeywordFields({ word: word })
        next()
      },
    },
  ],
})
export default router
