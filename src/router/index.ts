import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { Utils } from '@/utils'
import { useWordStore } from '@/stores'

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
      // 捕获所有路径
      path: '/:pathMatch(.*)*',
      name: 'home',
      component: HomeView,
      beforeEnter: (to, from, next) => {
        const store = useWordStore()
        const word = to.path.slice(1) // 移除开头的 /
        // 如果word无效，重定向到随机word
        if (!Utils.isValidWord(word)) {
          next(`/${Utils.getRandomWord()}`)
          return
        }
        // 设置新的word
        store.setWord(word)
        next()
      },
    },
  ],
})
export default router

