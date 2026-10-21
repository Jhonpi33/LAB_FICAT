import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Quasar, Notify, Dialog, Loading } from 'quasar'

// Quasar (CSS + iconos)
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'

import './css/app.scss'

import App from './App.vue'
import router from './router/index.js'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Quasar, {
  plugins: {
    Notify,
    Dialog,
    Loading
  }
})

app.mount('#q-app')
