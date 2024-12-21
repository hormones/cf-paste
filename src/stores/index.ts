import { createPinia, defineStore } from 'pinia'

export const pinia = createPinia()

export const useWordStore = defineStore('word', {
  state: () => ({
    word: '' as string,
  }),
  actions: {
    setWord(word: string) {
      this.word = word
    },
  },
})
