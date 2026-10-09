import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Quasar, Notify, Dialog, Loading, Dark } from 'quasar'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'
import './css/app.scss'
import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/theme'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(Quasar, {
  plugins: { Notify, Dialog, Loading, Dark },
  config: { brand: { primary: '#7d39eb', secondary: '#00808c' } },
})
app.use(router)
const theme = useThemeStore()
theme.initialize()
Dark.set(theme.isDark)
app.mount('#app')
