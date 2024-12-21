import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { useWordStore } from '@/stores'

// 生成随机word
function generateRandomWord(length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'
  return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join(
    '',
  )
}

// 验证word格式
function isValidWord(word: string): boolean {
  return /^[a-zA-Z0-9_]{3,20}$/.test(word)
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'root',
      component: HomeView,
      beforeEnter: (to, from, next) => {
        const randomWord = generateRandomWord()
        next(`/${randomWord}`)
      },
    },
    {
      // 捕获所有路径
      path: '/:pathMatch(.*)*',
      name: 'home',
      component: HomeView,
      beforeEnter: (to, from, next) => {
        const word = to.path.slice(1) // 移除开头的 /
        const store = useWordStore()
        // 如果word无效，重定向到随机word
        if (!isValidWord(word)) {
          next(`/${generateRandomWord()}`)
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
