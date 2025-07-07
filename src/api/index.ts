import { useAppStore } from '@/stores'

export default {
  getUrlPrefix: () => {
    const appStore = useAppStore()
    const basePath = appStore.calculateUrlPrefix()
    return `${basePath}/api`
  },
}
