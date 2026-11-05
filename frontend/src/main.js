/**
 * main.js — punto de entrada de la aplicación.
 *
 * Es el único archivo que "arma" el proyecto: crea la app, le instala los
 * plugins (Pinia, Router, Quasar) y la monta en el <div id="app"> del index.html.
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import { router } from './router'
import { instalarQuasar } from './plugins/quasar'

// Los estilos propios van DESPUÉS de los de Quasar (que se importan dentro de
// plugins/quasar.js) para que las personalizaciones ganen.
import './styles/main.scss'

const app = createApp(App)

// Pinia con el plugin de persistencia: los stores que declaren "persist: true"
// se guardan solos en localStorage y se recuperan al abrir la aplicación.
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia) // estado global  -> /store
app.use(router) // navegación    -> /router
instalarQuasar(app) // interfaz   -> /plugins/quasar.js

app.mount('#app')
