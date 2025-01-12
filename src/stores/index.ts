import { createPinia, defineStore } from 'pinia'

export const pinia = createPinia()

export const useWordStore = defineStore('word', {
  state: () => ({
    word: '' as string,
    view_word: '' as string,
    timestamp: '' as string,
    authorization: '' as string,
  }),
  actions: {
    setWord(word: string) {
      this.word = word
    },
    setViewWord(word: string) {
      this.view_word = word
    },
  },
})
