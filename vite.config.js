import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'

// Carpeta raíz del proyecto (donde está este archivo).
const raizProyecto = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5174, // el mismo puerto que el backend permite en CORS (FRONTEND_URL)
    strictPort: true,
    allowedHosts: ['.trycloudflare.com'],
  },
  plugins: [
    // transformAssetUrls permite que componentes de Quasar (q-img, q-avatar...)
    // resuelvan rutas de /src/assets igual que las etiquetas <img> normales.
    vue({ template: { transformAssetUrls } }),

    // sassVariables: archivo donde se sobreescriben los colores de marca de Quasar.
    quasar({ sassVariables: 'src/styles/variables.scss' }),
  ],
  resolve: {
    alias: {
      // "@" apunta siempre a /src -> se acaban los "../../../components/..."
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      // El plugin de Quasar inyecta un @import de variables.scss en cada hoja;
      // con loadPaths Sass sabe resolverlo desde la raíz.
      scss: { loadPaths: [raizProyecto] },
      sass: { loadPaths: [raizProyecto] },
    },
  },
})
