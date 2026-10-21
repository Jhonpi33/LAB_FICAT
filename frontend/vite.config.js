import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({ template: { transformAssetUrls } }),
    quasar()
  ],
  server: {
    port: 5173,
    // API.md §1: en desarrollo se recomienda baseURL '/api' aprovechando el
    // proxy de Vite hacia el backend (evita CORS y funciona en cualquier puerto).
    proxy: {
      '/api': {
        target: 'http://localhost:3100',
        changeOrigin: true
      }
    }
  }
})
