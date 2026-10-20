import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import '@milkdown/crepe/theme/common/style.css'
import './styles/global.scss'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
