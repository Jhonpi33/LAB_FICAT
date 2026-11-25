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
import api from './plugins/axios'
import { instalarQuasar } from './plugins/quasar'
import { mostrarSalpicadura } from './splash/controlador'

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

/**
 * PANTALLA DE CARGA (salpicadura de pintura) — 1.º USO: al abrir la app.
 *
 * Se lanza DESPUÉS del montaje para poder esperar de verdad a que la ruta
 * inicial, la API y los recursos estén listos; su duración depende de la
 * velocidad del internet (mínimo 1 s, máximo 6 s). Al terminar se desliza
 * hacia abajo y se elimina sin dejar rastro.
 *
 * El 2.º uso es en /views/LoginView.vue, tras iniciar sesión.
 *
 * Se pasa `api.defaults.baseURL` para que la comprobación use la misma URL
 * que toda la aplicación, sin duplicar la configuración de entorno.
 */
mostrarSalpicadura({
  router,
  apiUrl: api.defaults.baseURL,
  contexto: { estado: 'Preparando el sistema…' },
})
