import { useAppStore } from '@/stores'

export default {
  getUrlPrefix: () => {
    const appStore = useAppStore()
    return `/api${appStore.urlPrefix}`
  },
}
