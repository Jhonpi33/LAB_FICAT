/**
 * @fileoverview /plugins/quasar.js
 * Registro y configuración de Quasar como plugin de Vue.
 *
 * Aquí se declaran los "Quasar Plugins" (Notify, Dialog, Loading). Si un plugin
 * no se declara en esta lista, this.$q.notify() falla en tiempo de ejecución.
 */
import { Quasar, Notify, Dialog, Loading } from 'quasar'

// Iconos y estilos base de Quasar.
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'

// Idioma español para textos internos (paginación de tablas, botones de diálogos...).
import lang from 'quasar/lang/es'

/**
 * Instala Quasar en la instancia de Vue.
 * @param {import("vue").App} app - instancia creada con createApp()
 */
export function instalarQuasar(app) {
  app.use(Quasar, {
    plugins: { Notify, Dialog, Loading },
    lang,
    config: {
      notify: {
        position: 'top-right',
        timeout: 3000,
        actions: [{ icon: 'close', color: 'white', round: true }],
      },
    },
  })
}
