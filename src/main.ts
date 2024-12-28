import './assets/main.css'
import 'element-plus/dist/index.css'
import 'element-plus/es/components/dialog/style/css'
import 'element-plus/es/components/overlay/style/css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')
