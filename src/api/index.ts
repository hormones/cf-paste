import { useAppStore } from '@/stores'

export default {
  getUrlPrefix: () => {
    const appStore = useAppStore()
    return `${appStore.urlPrefix}/api`
  },
}
